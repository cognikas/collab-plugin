import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listDaemons, readDaemonInfo, type DaemonInfo } from './state.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Bundled next to this file by the build, so no install step is ever needed. */
function daemonEntry(): string {
  return path.join(process.env.CLAUDE_PLUGIN_ROOT ?? path.join(here, '..'), 'dist', 'daemon.mjs');
}

export class DaemonUnavailable extends Error {}

function samePath(a: string, b: string): boolean {
  const norm = (p: string) => p.replace(/[\\/]+$/, '').replace(/\\/g, '/').toLowerCase();
  return norm(a) === norm(b);
}

export interface SessionHints {
  /** Pid of the Claude Code process this MCP server was spawned by. */
  claudePid?: number;
  /** Session id Claude Code put in this server's environment when it spawned it. */
  sessionId?: string;
  cwd: string;
}

/**
 * Which session an MCP server belongs to. Hooks are handed their `session_id`
 * on stdin; an MCP server is not, and matching on the working directory picks
 * the wrong daemon as soon as two sessions share a repo.
 *
 * 1. A daemon started by the same Claude Code process. Hooks and MCP servers
 *    are both its direct children, so this is exact, and newest-first follows
 *    a `/clear`, which starts a new session inside the same process.
 * 2. `CLAUDE_CODE_SESSION_ID`: right for the session the server was spawned
 *    for, but frozen at spawn time, which is why a daemon match beats it.
 * 3. Daemons from before `claudePid` existed: working directory, then newest.
 */
export function pickSession(daemons: DaemonInfo[], hints: SessionHints): string {
  const sameProcess = hints.claudePid ? daemons.find((d) => d.claudePid === hints.claudePid) : undefined;
  if (sameProcess) return sameProcess.clientSessionId;
  if (hints.sessionId) return hints.sessionId;

  if (daemons.length === 0) return 'default';
  return (daemons.find((d) => samePath(d.cwd, hints.cwd)) ?? daemons[0]!).clientSessionId;
}

export function resolveSessionId(): string {
  const explicit = process.env.COLLAB_CLIENT_SESSION_ID;
  if (explicit) return explicit;

  return pickSession(listDaemons(), {
    claudePid: process.ppid,
    sessionId: process.env.CLAUDE_CODE_SESSION_ID ?? process.env.CLAUDE_SESSION_ID,
    cwd: process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
  });
}

/**
 * Starts the daemon if this session does not have one yet, then waits for it to
 * publish its loopback port. Detached, so it outlives the hook that spawned it.
 * It inherits COLLAB_CLAUDE_PID from the hook or MCP server that starts it.
 */
export async function ensureDaemon(clientSessionId: string, timeoutMs = 8_000): Promise<DaemonInfo> {
  const existing = readDaemonInfo(clientSessionId);
  if (existing) return existing;

  const child = spawn(process.execPath, [daemonEntry()], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env, COLLAB_CLIENT_SESSION_ID: clientSessionId },
  });
  child.on('error', () => undefined);
  child.unref();

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 120));
    const info = readDaemonInfo(clientSessionId);
    if (info) return info;
  }
  throw new DaemonUnavailable('the collab-channel daemon did not start in time');
}

export interface CallOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  timeoutMs?: number;
  /** Start the daemon when it is not already running. */
  autostart?: boolean;
}

export async function callDaemon<T>(clientSessionId: string, path: string, options: CallOptions = {}): Promise<T> {
  const { method = 'GET', body, query, timeoutMs = 20_000, autostart = false } = options;

  const info = autostart ? await ensureDaemon(clientSessionId) : readDaemonInfo(clientSessionId);
  if (!info) throw new DaemonUnavailable('no collab-channel daemon is running for this session');

  const url = new URL(`http://127.0.0.1:${info.port}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json', 'x-collab-token': info.token },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await res.text();
  const parsed = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error((parsed as { error?: string }).error ?? `daemon returned ${res.status}`);
  return parsed as T;
}

export function stopDaemon(clientSessionId: string): Promise<unknown> {
  return callDaemon(clientSessionId, '/shutdown', { method: 'POST', timeoutMs: 2_000 });
}
