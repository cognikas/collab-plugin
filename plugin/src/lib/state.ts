import fs from 'node:fs';
import path from 'node:path';
import {
  URGENCY_RANK, type Claim, type ContextSummary, type Member, type Message, type Task, type TaskList, type Urgency,
} from './model.js';
import { dataDir, sessionDir, sessionsRoot } from './config.js';

/**
 * Everything here is synchronous and file-based on purpose: hooks are
 * short-lived processes that must finish in milliseconds, so they read what the
 * daemon already wrote rather than talking to the network themselves.
 */

export interface DaemonInfo {
  pid: number;
  port: number;
  token: string;
  startedAt: number;
  clientSessionId: string;
  /** Working directory of the session that owns it. Only the last resort for
   *  matching a daemon to an MCP server now; see `pickSession`. */
  cwd: string;
  /** Pid of the Claude Code process the session runs in. Hooks and MCP servers
   *  are both its direct children, so this pairs them exactly. Absent when the
   *  daemon was started outside Claude Code (the CLI, a script). */
  claudePid?: number;
}

/**
 * What the session is doing, as far as its hooks have seen. Written by the
 * hooks in `channel` mode only, and read by the channel push, which must only
 * push into an idle session and needs to know whether a push started a turn.
 */
export interface TurnState {
  busy: boolean;
  /** Last time the user submitted a prompt. */
  promptAt: number;
  /** Last sign of a turn the user did not start by typing: a tool call, a Stop,
   *  or a prompt that carries one of our channel events. */
  activityAt: number;
  /** When the SessionStart hook finished delivering the backlog. */
  sessionStartAt: number;
}

/** Whether `channel` delivery is live for a session, and if not, why. */
export interface ChannelStatus {
  state: 'active' | 'fallback';
  reason?: string;
  /** Scopes the status to one Claude Code process: a resumed session reuses its id. */
  claudePid: number;
  at: number;
  /** The fallback has been shown to the model once already. */
  announced?: boolean;
}

export interface Cursor {
  /** Highest seq already shown to this Claude Code session. */
  delivered: number;
  /** Highest seq acknowledged to the server. */
  acked: number;
  /** Guards the Stop hook against interrupting on a loop. */
  lastBlockAt: number;
}

export interface LocalState {
  connected: boolean;
  channel: string;
  /** This member's id. */
  self: string;
  /** How the others address this member. */
  handle: string;
  /** The topic this session joined. The daemon keeps it across its own restarts. */
  topic: string;
  members: Member[];
  claims: Claim[];
  contextIndex: ContextSummary[];
  /** The topic's task lists with open tasks, most recently changed first. */
  taskLists: TaskList[];
  /**
   * The topic's open and in-progress tasks, as the last read of them left them,
   * so the hooks and the statusline can say who is doing what without the
   * network. Absent until the first read.
   */
  tasks?: Task[];
  /** Set by a hello and cleared by the read of the topic's tasks that follows it: until then `tasks` may be behind. */
  tasksStale?: boolean;
  latestSeq: number;
  updatedAt: number;
  lastError?: string;
  /** Set when the server refused this client for good (unsupported protocol,
   *  revoked member): the daemon stopped reconnecting, and says why. */
  fatal?: string;
  /** When a daemon last died before it could serve the session; `lastError` says why. */
  failedAt?: number;
  /** The backend release and the protocol version agreed in the last hello. */
  server?: string;
}

const EMPTY_STATE: LocalState = {
  connected: false, channel: '', self: '', handle: '', topic: '', members: [], claims: [],
  contextIndex: [], taskLists: [], latestSeq: 0, updatedAt: 0,
};

const EMPTY_CURSOR: Cursor = { delivered: 0, acked: 0, lastBlockAt: 0 };

function file(clientSessionId: string, name: string): string {
  return path.join(sessionDir(clientSessionId), name);
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

/** Write to a sibling then rename: a hook must never read a half-written file. */
function writeJsonAtomic(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  for (let attempt = 1; ; attempt++) {
    try {
      fs.renameSync(tmp, filePath);
      return;
    } catch (err) {
      // Windows refuses to replace a file some other process holds open for a
      // moment — typically an antivirus scan of the file just written.
      const code = (err as NodeJS.ErrnoException).code ?? '';
      if (attempt >= 5 || !['EPERM', 'EACCES', 'EBUSY'].includes(code)) {
        try { fs.unlinkSync(tmp); } catch { /* nothing to clean */ }
        throw err;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20 * attempt);
    }
  }
}

/* ── Daemon registration ────────────────────────────────────────────────── */

export function readDaemonInfo(clientSessionId: string): DaemonInfo | undefined {
  const info = readJson<DaemonInfo | undefined>(file(clientSessionId, 'daemon.json'), undefined);
  if (!info) return undefined;
  return isAlive(info.pid) ? info : undefined;
}

export function writeDaemonInfo(info: DaemonInfo): void {
  writeJsonAtomic(file(info.clientSessionId, 'daemon.json'), info);
}

/** Every live daemon on this machine, newest first. */
export function listDaemons(): DaemonInfo[] {
  const root = sessionsRoot();
  let entries: string[];
  try {
    entries = fs.readdirSync(root);
  } catch {
    return [];
  }

  return entries
    .map((entry) => readJson<DaemonInfo | undefined>(path.join(root, entry, 'daemon.json'), undefined))
    .filter((info): info is DaemonInfo => Boolean(info) && isAlive(info!.pid))
    .sort((a, b) => b.startedAt - a.startedAt);
}

/**
 * Removes a session's registration. With `pid`, only while it is still that
 * daemon's: one that lost the session to another daemon must not unregister
 * the winner, which would then shut down too at its next watchdog check.
 */
export function clearDaemonInfo(clientSessionId: string, pid?: number): void {
  const target = file(clientSessionId, 'daemon.json');
  if (pid !== undefined && readJson<DaemonInfo | undefined>(target, undefined)?.pid !== pid) return;
  try { fs.unlinkSync(target); } catch { /* already gone */ }
}

/* ── MCP servers ────────────────────────────────────────────────────────── */

/**
 * One running MCP server of this plugin. Claude Code runs it for as long as it
 * keeps a session's tools, so a daemon whose Claude Code process has none left
 * takes its session to be over, even while that process lives on (as a
 * background spare, say).
 */
export interface McpServerInfo {
  pid: number;
  /** The Claude Code process it serves: MCP servers are its direct children. */
  claudePid: number;
  startedAt: number;
}

function mcpRoot(): string {
  return path.join(dataDir(), 'mcp');
}

export function registerMcpServer(info: McpServerInfo): void {
  writeJsonAtomic(path.join(mcpRoot(), `${info.pid}.json`), info);
}

export function unregisterMcpServer(pid: number): void {
  try { fs.unlinkSync(path.join(mcpRoot(), `${pid}.json`)); } catch { /* already gone */ }
}

/** The MCP servers still running for one Claude Code process. Registrations of dead ones are removed on the way. */
export function liveMcpServers(claudePid: number): McpServerInfo[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(mcpRoot());
  } catch {
    return [];
  }

  const live: McpServerInfo[] = [];
  for (const entry of entries.filter((name) => name.endsWith('.json'))) {
    const info = readJson<McpServerInfo | undefined>(path.join(mcpRoot(), entry), undefined);
    if (!info) continue;
    if (!isAlive(info.pid)) unregisterMcpServer(info.pid);
    else if (info.claudePid === claudePid) live.push(info);
  }
  return live;
}

export function isAlive(pid: number): boolean {
  try {
    // Signal 0 tests for existence without touching the process.
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM means it exists but is not ours to signal.
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/* ── Inbox ──────────────────────────────────────────────────────────────── */

export function appendInbox(clientSessionId: string, message: Message): void {
  const target = file(clientSessionId, 'inbox.jsonl');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.appendFileSync(target, `${JSON.stringify(message)}\n`);
}

export function readInbox(clientSessionId: string, sinceSeq = 0): Message[] {
  let raw: string;
  try {
    raw = fs.readFileSync(file(clientSessionId, 'inbox.jsonl'), 'utf8');
  } catch {
    return [];
  }

  const seen = new Set<number>();
  const messages: Message[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const message = JSON.parse(line) as Message;
      // A reconnect can replay history; the seq makes de-duplication trivial.
      if (message.seq > sinceSeq && !seen.has(message.seq)) {
        seen.add(message.seq);
        messages.push(message);
      }
    } catch {
      // A torn final line is expected if the daemon died mid-write.
    }
  }
  return messages.sort((a, b) => a.seq - b.seq);
}

/** Keeps the inbox from growing without bound over a long-lived session. */
export function truncateInbox(clientSessionId: string, keepLast = 500): void {
  const messages = readInbox(clientSessionId, 0);
  if (messages.length <= keepLast) return;
  const target = file(clientSessionId, 'inbox.jsonl');
  const kept = messages.slice(-keepLast).map((m) => JSON.stringify(m)).join('\n');
  fs.writeFileSync(`${target}.tmp`, `${kept}\n`);
  fs.renameSync(`${target}.tmp`, target);
}

/* ── Cursor ─────────────────────────────────────────────────────────────── */

export function readCursor(clientSessionId: string): Cursor {
  return { ...EMPTY_CURSOR, ...readJson<Partial<Cursor>>(file(clientSessionId, 'cursor.json'), {}) };
}

export function writeCursor(clientSessionId: string, patch: Partial<Cursor>): Cursor {
  const next = { ...readCursor(clientSessionId), ...patch };
  writeJsonAtomic(file(clientSessionId, 'cursor.json'), next);
  return next;
}

/* ── Turn state and channel status ──────────────────────────────────────── */

const EMPTY_TURN: TurnState = { busy: false, promptAt: 0, activityAt: 0, sessionStartAt: 0 };

export function readTurn(clientSessionId: string): TurnState | undefined {
  const turn = readJson<Partial<TurnState> | undefined>(file(clientSessionId, 'turn.json'), undefined);
  return turn ? { ...EMPTY_TURN, ...turn } : undefined;
}

export function writeTurn(clientSessionId: string, patch: Partial<TurnState>): TurnState {
  const next = { ...EMPTY_TURN, ...readTurn(clientSessionId), ...patch };
  writeJsonAtomic(file(clientSessionId, 'turn.json'), next);
  return next;
}

export function readChannelStatus(clientSessionId: string): ChannelStatus | undefined {
  return readJson<ChannelStatus | undefined>(file(clientSessionId, 'channel.json'), undefined);
}

export function writeChannelStatus(clientSessionId: string, status: ChannelStatus): void {
  writeJsonAtomic(file(clientSessionId, 'channel.json'), status);
}

/* ── Channel snapshot ───────────────────────────────────────────────────── */

export function readLocalState(clientSessionId: string): LocalState {
  return { ...EMPTY_STATE, ...readJson<Partial<LocalState>>(file(clientSessionId, 'state.json'), {}) };
}

export function writeLocalState(clientSessionId: string, patch: Partial<LocalState>): LocalState {
  const next = { ...readLocalState(clientSessionId), ...patch, updatedAt: Date.now() };
  writeJsonAtomic(file(clientSessionId, 'state.json'), next);
  return next;
}

/**
 * Keeps the topic's task lists current from a list as some change left it: a
 * task notice, or the answer to this session's own change (it gets no notice
 * of its own). A list of another topic changes nothing here, and one with no
 * open tasks left drops out, as it does from the server's state.
 */
export function applyTaskList(clientSessionId: string, list: TaskList): void {
  const state = readLocalState(clientSessionId);
  if (state.topic && list.topic !== state.topic) return;
  const known = state.taskLists.find((l) => l.key === list.key);
  if (known && known.updatedAt > list.updatedAt) return;
  const others = state.taskLists.filter((l) => l.key !== list.key);
  const kept = list.open + list.inProgress > 0 ? [list, ...others] : others;
  writeLocalState(clientSessionId, { taskLists: kept.sort((a, b) => b.updatedAt - a.updatedAt) });
}

const isOpen = (task: Task) => task.status === 'open' || task.status === 'in_progress';

/**
 * Keeps the topic's open tasks current from a read of them: every list's, or
 * only `list`'s. Closed tasks drop out, as they do from the lists' counts, and a
 * task of another topic changes nothing here.
 */
export function applyTasks(clientSessionId: string, tasks: Task[], list?: string): void {
  const state = readLocalState(clientSessionId);
  const read = tasks.filter((t) => (!state.topic || t.topic === state.topic) && isOpen(t));
  const kept = list === undefined ? [] : (state.tasks ?? []).filter((t) => t.list !== list);
  writeLocalState(clientSessionId, { tasks: [...kept, ...read], tasksStale: false });
}

/**
 * The same for one task, as this session's own change left it: a session gets
 * no notice of its own change. An answer older than what is cached changes nothing.
 */
export function applyTask(clientSessionId: string, task: Task): void {
  const state = readLocalState(clientSessionId);
  if (state.topic && task.topic !== state.topic) return;
  const tasks = state.tasks ?? [];
  const same = (t: Task) => t.list === task.list && t.number === task.number;
  const known = tasks.find(same);
  if (known && known.updatedAt > task.updatedAt) return;
  const others = tasks.filter((t) => !same(t));
  writeLocalState(clientSessionId, { tasks: isOpen(task) ? [...others, task] : others });
}

/* ── Derived views ──────────────────────────────────────────────────────── */

/*
 * None of these filter out the member's own messages any more. The server
 * never sends a session what it sent itself, and what arrives from the same
 * member was sent from another of its sessions, addressed to this one.
 */

export interface UnreadOptions {
  minUrgency?: Urgency;
}

/**
 * The last few messages regardless of the read cursor.
 *
 * Compaction wipes what was already injected, so re-showing state afterwards
 * has to ignore "unread" — by then everything relevant has usually been read.
 */
export function recentMessages(clientSessionId: string, limit = 10): Message[] {
  return readInbox(clientSessionId, 0).slice(-limit);
}

export function unreadMessages(clientSessionId: string, options: UnreadOptions = {}): Message[] {
  const { delivered } = readCursor(clientSessionId);
  const threshold = URGENCY_RANK[options.minUrgency ?? 'low'];
  return readInbox(clientSessionId, delivered).filter((message) => URGENCY_RANK[message.urgency] >= threshold);
}

/**
 * The oldest `limit` unread messages, and how many are left after them. Oldest
 * first because the read cursor is a high-water mark: marking read up to the
 * last one returned skips nothing, where taking the newest would mark the older
 * ones read unseen.
 */
export function unreadPage(clientSessionId: string, limit = 50): { page: Message[]; rest: number } {
  const unread = unreadMessages(clientSessionId);
  const page = unread.slice(0, Number.isFinite(limit) && limit >= 1 ? Math.floor(limit) : 50);
  return { page, rest: unread.length - page.length };
}

/** Given messages from this session's inbox, read or not, and the seqs it does not hold. */
export function messagesBySeq(clientSessionId: string, seqs: unknown[]): { found: Message[]; missing: number[] } {
  const wanted = [...new Set(seqs.map(Number).filter((seq) => Number.isInteger(seq) && seq > 0))];
  const found = readInbox(clientSessionId, 0).filter((message) => wanted.includes(message.seq));
  return { found, missing: wanted.filter((seq) => !found.some((message) => message.seq === seq)) };
}

export interface WaitFilter extends UnreadOptions {
  /** Only these message types end the wait. Empty or omitted means any. */
  types?: string[];
}

/**
 * Everything past `since`, and the first message in it that should end a wait.
 *
 * The filter decides *when* to wake, never *what* is returned: callers advance
 * a single high-water-mark cursor to the newest seq they got back, so dropping
 * a message that did not match would hide it for good.
 */
export function messagesSince(
  clientSessionId: string,
  since: number,
  filter: WaitFilter = {},
): { messages: Message[]; trigger?: Message } {
  const threshold = URGENCY_RANK[filter.minUrgency ?? 'low'];
  const types = filter.types ?? [];
  const messages = readInbox(clientSessionId, since);
  const trigger = messages.find((message) => URGENCY_RANK[message.urgency] >= threshold
    && (types.length === 0 || types.includes(message.type)));
  return { messages, trigger };
}

/**
 * What an interruption (end of turn, or after a tool call mid-turn) delivers:
 * nothing unless some unread message reaches `minUrgency`, and then every
 * unread message — for the same cursor reason as `messagesSince`. Urgency
 * decides whether to interrupt, never what is shown.
 */
export function interruptionBatch(clientSessionId: string, minUrgency: Urgency): Message[] {
  const { messages, trigger } = messagesSince(clientSessionId, readCursor(clientSessionId).delivered, { minUrgency });
  return trigger ? messages : [];
}

/**
 * Flattens peer-authored text before it is rendered into the model's context.
 *
 * A message reaches the other session verbatim, so it must not be able to forge
 * the structure it is rendered into — a newline plus a plausible-looking
 * `#99 SYSTEM ...` line would otherwise read as a second, separate message.
 */
export function flattenForContext(text: string): string {
  return String(text ?? '')
    // Line and paragraph separators break a line as surely as \n does.
    .replace(/\r?\n|[\u2028\u2029]/g, ' ⏎ ')
    // Controls, and the bidirectional overrides that make text read out of order.
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, ' ');
}

/** Matches a file path against the glob-ish patterns used by claims. */
export function pathMatchesClaim(filePath: string, patterns: string[]): boolean {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  return patterns.some((pattern) => globToRegExp(pattern).test(normalized));
}

function globToRegExp(pattern: string): RegExp {
  const normalized = pattern.replace(/\\/g, '/').toLowerCase();
  let out = '';
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i]!;
    if (char === '*') {
      if (normalized[i + 1] === '*') {
        out += '.*';
        i++;
        if (normalized[i + 1] === '/') i++;
      } else {
        out += '[^/]*';
      }
    } else if (char === '?') {
      out += '[^/]';
    } else {
      out += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  // A bare directory or file name should also match anywhere in the tree.
  return new RegExp(`(^|/)${out}(/|$)`);
}
