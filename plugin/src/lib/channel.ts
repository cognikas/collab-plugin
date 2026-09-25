import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { UNTRUSTED_NOTE } from './render.js';
import type { TurnState } from './state.js';

/**
 * `channel` delivery: the MCP server pushes peer messages into the session as
 * Claude Code channel events (research preview) while the session is idle.
 *
 * Claude Code gives a channel server no way to learn whether it was registered:
 * events for a session not started with the channel flag, or whose organization
 * blocks channels, are dropped without an error. Everything here exists to
 * never mark a message delivered on the strength of a push that went nowhere.
 */

export const PLUGIN_NAME = 'collab-channel';

/** A turn with no hook activity for this long is treated as over: Stop does not
 *  fire when the user interrupts, and a stuck `busy` would block pushes forever. */
export const BUSY_STALE_MS = 10 * 60 * 1000;

/** How long a push has to show up as a turn before it counts as dropped. */
export const CONFIRM_WINDOW_MS = 180 * 1000;

export type ChannelFlag = 'development' | 'channels';

/**
 * Which flag, if any, opted this plugin in as a channel in a Claude Code
 * command line. Custom plugins are not on the research-preview allowlist, so
 * only the development flag registers them unless an organization allowlists
 * the plugin; `--channels` is still reported, and a push that goes nowhere is
 * caught later by `pushOutcome`.
 */
export function channelFlag(commandLine: string, plugin = PLUGIN_NAME): ChannelFlag | undefined {
  const tokens = (commandLine.match(/"[^"]*"|\S+/g) ?? []).map((t) => t.replace(/^"|"$/g, ''));
  const names: Record<string, ChannelFlag> = {
    '--dangerously-load-development-channels': 'development',
    '--channels': 'channels',
  };
  const ours = (entry: string) => entry.split(',').some((e) => e.trim().toLowerCase().startsWith(`plugin:${plugin}@`));

  let current: ChannelFlag | undefined;
  let found: ChannelFlag | undefined;
  for (const token of tokens) {
    if (token.startsWith('--')) {
      const eq = token.indexOf('=');
      current = names[eq >= 0 ? token.slice(0, eq) : token];
      if (current && eq >= 0 && ours(token.slice(eq + 1))) found = found === 'development' ? found : current;
      continue;
    }
    // The development flag is the one that works for a custom plugin, so it wins.
    if (current && ours(token)) found = found === 'development' ? found : current;
  }
  return found;
}

/** Command line of a process, or undefined when the platform will not say. */
export function readCommandLine(pid: number): Promise<string | undefined> {
  if (process.platform === 'linux') {
    try {
      return Promise.resolve(fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0').join(' ').trim());
    } catch {
      return Promise.resolve(undefined);
    }
  }

  const [command, args] = process.platform === 'win32'
    ? ['powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      `(Get-CimInstance Win32_Process -Filter "ProcessId=${Math.trunc(pid)}").CommandLine`]]
    : ['ps', ['-o', 'command=', '-p', String(Math.trunc(pid))]];

  return new Promise((resolve) => {
    execFile(command, args, { timeout: 10_000, windowsHide: true }, (err, stdout) => {
      resolve(err ? undefined : stdout.trim() || undefined);
    });
  });
}

/** Idle unless a turn is running, and a turn no hook has heard from in a while is over. */
export function isIdle(turn: TurnState | undefined, now = Date.now()): boolean {
  if (!turn?.busy) return true;
  return now - Math.max(turn.promptAt, turn.activityAt) > BUSY_STALE_MS;
}

export type PushOutcome = 'confirmed' | 'ambiguous' | 'pending' | 'dropped';

/**
 * Whether a push into an idle session was delivered. A delivered event starts
 * a turn, and every turn leaves hook activity behind (a tool call, a Stop), so
 * activity after the push confirms it. A prompt the user typed in the meantime
 * could have started that activity itself, so it proves nothing either way.
 * Nothing at all within the window means Claude Code dropped the event.
 */
export function pushOutcome(turn: TurnState | undefined, pushedAt: number, now = Date.now()): PushOutcome {
  if (turn && turn.promptAt >= pushedAt) return 'ambiguous';
  if (turn && turn.activityAt >= pushedAt) return 'confirmed';
  return now - pushedAt > CONFIRM_WINDOW_MS ? 'dropped' : 'pending';
}

/**
 * A prompt that is really one of our channel events, rather than the user
 * typing. Whether Claude Code hands the tag or only its content to the hook is
 * not documented, so either one counts: every event's content opens with the
 * untrusted-text note.
 */
export function isChannelPrompt(prompt: string | undefined): boolean {
  if (typeof prompt !== 'string') return false;
  return prompt.includes('collab_seq=') || prompt.includes(`plugin:${PLUGIN_NAME}`) || prompt.includes(UNTRUSTED_NOTE);
}
