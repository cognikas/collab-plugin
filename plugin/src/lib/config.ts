import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { slug } from '@collab/protocol';
import type { Urgency } from './model.js';

/** `channel` is `stop` plus a push into the idle session; see lib/channel.ts. */
export type DeliveryMode = 'stop' | 'prompt' | 'manual' | 'all' | 'channel';

export interface PluginConfig {
  apiEndpoint: string;
  inviteCode?: string;
  displayName: string;
  /** False when `displayName` is only the OS username, because none was configured or none is visible here. */
  displayNameSet?: boolean;
  /**
   * Whether this process can see /config at all. Claude Code hands the options
   * only to the plugin's own processes (hooks, and the MCP server through
   * .mcp.json), never to a command run from a session's Bash tool.
   */
  optionsVisible?: boolean;
  deliveryMode: DeliveryMode;
  stopMinUrgency: Urgency;
  /** Lowest urgency injected after a tool call, mid-turn; `off` disables it. */
  midTurnMinUrgency: Urgency | 'off';
  desktopNotifications: boolean;
  claimWarnings: boolean;
  /** Explicit topic; the repo name when unset. See `resolveTopic`. */
  topic?: string;
  /** Set when the user moved the secret into the OS keychain via /config. */
  memberId?: string;
  memberSecret?: string;
}

export interface Credentials {
  apiEndpoint: string;
  wsEndpoint: string;
  /** The member credential Join issued: one per developer install. */
  memberId: string;
  secret: string;
  channel: string;
  displayName: string;
  /** How the others address you. */
  handle?: string;
  joinedAt: number;
}

/**
 * Plugin-scoped storage that survives plugin updates. Claude Code exports this
 * to hook and MCP subprocesses.
 *
 * Under `v1/`: 1.0 keeps the plugin id of 0.6 (collab-channel@cognikas), so the
 * two share CLAUDE_PLUGIN_DATA. 0.6's credentials belong to another backend and
 * its inbox to another protocol; neither must be read as 1.0's.
 */
export function dataDir(): string {
  return path.join(dataRoot(), 'v1');
}

/**
 * Without CLAUDE_PLUGIN_DATA (the CLI run from a session's Bash tool, a status
 * line script) this is still the plugin's own folder, the one the daemon and
 * the hooks use. Writing credentials anywhere else left the plugin without
 * them, redeeming an invite that was already spent.
 */
function dataRoot(): string {
  if (process.env.CLAUDE_PLUGIN_DATA) return process.env.CLAUDE_PLUGIN_DATA;
  const installed = installedDataRoots();
  return installed.find((dir) => fs.existsSync(path.join(dir, 'v1'))) ?? installed[0] ?? legacyDataRoot();
}

/** Where Claude Code keeps this plugin's data: ~/.claude/plugins/data/collab-channel-<marketplace>. */
export function installedDataRoots(): string[] {
  const root = path.join(homedir(), '.claude', 'plugins', 'data');
  try {
    return fs.readdirSync(root).filter((name) => name.startsWith('collab-channel')).sort().map((name) => path.join(root, name));
  } catch {
    return [];
  }
}

/** Where the CLI used to keep things when run outside Claude Code. Only doctor still looks here. */
export function legacyDataRoot(): string {
  return path.join(homedir(), '.claude', 'collab-channel');
}

export function credentialsPath(): string {
  return path.join(dataDir(), 'credentials.json');
}

export function sessionsRoot(): string {
  return path.join(dataDir(), 'sessions');
}

export function sessionDir(clientSessionId: string): string {
  return path.join(sessionsRoot(), sanitize(clientSessionId));
}

function sanitize(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 80) || 'default';
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return !['false', '0', 'no', 'off'].includes(value.toLowerCase());
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  const found = allowed.find((a) => a === value?.toLowerCase());
  return found ?? fallback;
}

/** An option left empty in /config reaches the MCP server as the literal `${user_config.x}`. */
function optional(value: string | undefined): string | undefined {
  return value && !value.startsWith('${') ? value : undefined;
}

/**
 * Values configured through the plugin's `userConfig` arrive as environment
 * variables. Shell-form hook commands are not allowed to interpolate
 * `${user_config.*}`, so the environment is the supported path.
 */
export function readConfig(): PluginConfig {
  const e = process.env;
  const displayName = optional(e.CLAUDE_PLUGIN_OPTION_DISPLAY_NAME) ?? optional(e.COLLAB_DISPLAY_NAME);
  return {
    apiEndpoint: (optional(e.CLAUDE_PLUGIN_OPTION_API_ENDPOINT) ?? optional(e.COLLAB_API_ENDPOINT) ?? '').replace(/\/+$/, ''),
    inviteCode: optional(e.CLAUDE_PLUGIN_OPTION_INVITE_CODE) ?? optional(e.COLLAB_INVITE_CODE),
    displayName: displayName ?? e.USERNAME ?? e.USER ?? 'unnamed',
    displayNameSet: displayName !== undefined,
    optionsVisible: Object.keys(e).some((name) => name.startsWith('CLAUDE_PLUGIN_OPTION_')),
    deliveryMode: oneOf(e.CLAUDE_PLUGIN_OPTION_DELIVERY_MODE, ['stop', 'prompt', 'manual', 'all', 'channel'] as const, 'stop'),
    stopMinUrgency: oneOf(e.CLAUDE_PLUGIN_OPTION_STOP_MIN_URGENCY, ['low', 'normal', 'high'] as const, 'normal'),
    midTurnMinUrgency: oneOf(e.CLAUDE_PLUGIN_OPTION_MIDTURN_MIN_URGENCY, ['off', 'low', 'normal', 'high'] as const, 'high'),
    desktopNotifications: bool(e.CLAUDE_PLUGIN_OPTION_DESKTOP_NOTIFICATIONS, true),
    claimWarnings: bool(e.CLAUDE_PLUGIN_OPTION_CLAIM_WARNINGS, true),
    // The environment first: `env` in a project's .claude/settings.local.json is per project.
    topic: optional(e.COLLAB_TOPIC) || optional(e.CLAUDE_PLUGIN_OPTION_TOPIC),
    memberId: optional(e.CLAUDE_PLUGIN_OPTION_MEMBER_ID),
    memberSecret: optional(e.CLAUDE_PLUGIN_OPTION_MEMBER_SECRET),
  };
}

type Git = (cwd: string, args: string[]) => string | undefined;

const runGit: Git = (cwd, args) => {
  try {
    return execFileSync('git', args, {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2_000, windowsHide: true,
    }).trim() || undefined;
  } catch {
    return undefined;
  }
};

/**
 * The name of the repository `cwd` is in: the main checkout's folder, so a
 * worktree lands in the same topic as its repo. A submodule is its own repo;
 * outside git it is the folder itself.
 */
/**
 * Sets an environment variable for child processes, or removes it. Assigning
 * undefined to process.env stores the string "undefined", which the daemon
 * would then report as the session's branch.
 */
export function setEnv(name: string, value: string | undefined, env: NodeJS.ProcessEnv = process.env): void {
  if (value) env[name] = value;
  else delete env[name];
}

export function repoName(cwd: string, git: Git = runGit): string {
  const top = git(cwd, ['rev-parse', '--show-toplevel']);
  if (!top) return path.basename(cwd);
  // Relative to the top level when run there; absolute from a worktree.
  const common = git(top, ['rev-parse', '--git-common-dir']);
  const commonDir = common ? path.resolve(top, common) : '';
  return commonDir && path.basename(commonDir) === '.git' ? path.basename(path.dirname(commonDir)) : path.basename(top);
}

/**
 * Which topic a session joins: `COLLAB_TOPIC`, then the `topic` option, then
 * `saved`, the topic the session already joined, then the repo name.
 *
 * An explicit topic wins over the saved one, so setting it takes effect the
 * next time the session's daemon starts, `--resume` included. Without one, a
 * daemon that restarts mid-session keeps the saved topic even if the working
 * directory now points at another repo: a session does not wander off halfway.
 */
export function resolveTopic(config: Pick<PluginConfig, 'topic'>, cwd: string, git: Git = runGit, saved = ''): string {
  return slug(config.topic) || slug(saved) || slug(repoName(cwd, git)) || 'general';
}

/** The branch checked out in `cwd`, or undefined outside git. */
export function gitBranch(cwd: string, git: Git = runGit): string | undefined {
  return git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
}

export function readCredentials(): Credentials | undefined {
  try {
    return JSON.parse(fs.readFileSync(credentialsPath(), 'utf8')) as Credentials;
  } catch {
    return undefined;
  }
}

export function writeCredentials(creds: Credentials): void {
  fs.mkdirSync(dataDir(), { recursive: true });
  const file = credentialsPath();
  fs.writeFileSync(file, JSON.stringify(creds, null, 2), { mode: 0o600 });
  // mode is advisory on Windows; tighten the ACL so only the current user reads it.
  restrictToCurrentUser(file);
}

function restrictToCurrentUser(file: string): void {
  if (process.platform !== 'win32') return;
  try {
    const { execFileSync } = require('node:child_process') as typeof import('node:child_process');
    execFileSync('icacls', [file, '/inheritance:r', '/grant:r', `${process.env.USERNAME}:F`], {
      stdio: 'ignore',
    });
  } catch {
    // Best effort: a failure here should never stop the plugin from working.
  }
}

/**
 * The secret may live in the OS keychain (via a `sensitive` userConfig field) or
 * in the plugin data directory after an automatic invite redemption. Keychain wins.
 */
export function resolveCredentials(config: PluginConfig = readConfig()): Credentials | undefined {
  const file = readCredentials();
  // Credentials are only good on the backend that issued them: after api_endpoint
  // changes, the old ones would just fail with UNAUTHENTICATED.
  const stored = file?.memberId && (!config.apiEndpoint || file.apiEndpoint === config.apiEndpoint) ? file : undefined;
  if (config.memberId && config.memberSecret) {
    return {
      apiEndpoint: config.apiEndpoint || stored?.apiEndpoint || '',
      wsEndpoint: stored?.wsEndpoint ?? '',
      memberId: config.memberId,
      secret: config.memberSecret,
      channel: stored?.channel ?? '',
      displayName: config.displayName,
      handle: stored?.handle,
      joinedAt: stored?.joinedAt ?? Date.now(),
    };
  }
  return stored;
}
