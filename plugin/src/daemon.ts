/**
 * Long-lived companion to one Claude Code session.
 *
 * A Claude Code session is turn-based: nothing outside it can inject a turn.
 * So this process holds the WebSocket instead, writes everything it receives to
 * disk immediately, and exposes a loopback HTTP API. Hooks and the MCP server
 * are short-lived processes that only ever touch local files and localhost —
 * which is what keeps a hook fast enough to run on every turn.
 */
import crypto from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import WebSocket from 'ws';
import { HEARTBEAT_SECONDS, MemberStatus, type Result } from '@collab/protocol';
import {
  ackViaHttp, ApiError, channelViaHttp, fetchState, issueTicket, join, sendViaHttp, type Origin,
} from './lib/api.js';
import {
  dataDir, readConfig, resolveCredentials, resolveTopic, sessionDir, writeCredentials,
  type Credentials, type PluginConfig,
} from './lib/config.js';
import {
  clientFrame, decodeServerFrame, encodeFrame, fatalReason, handleServerFrame, subscribeFrame,
  WS_FRAME_LIMIT_BYTES, type RequestInit,
} from './lib/frames.js';
import { URGENCY_RANK, type Message, type OutgoingMessage, type Urgency } from './lib/model.js';
import { notifyDesktop } from './lib/notify.js';
import {
  appendInbox, clearDaemonInfo, isAlive, messagesSince, readCursor, readInbox, readLocalState, truncateInbox,
  writeCursor, writeDaemonInfo, writeLocalState,
} from './lib/state.js';
import { toClaim, toContextEntry, toSendRequest, toSendResult, toSnapshot } from './lib/wire.js';

const MAX_LIFETIME_MS = 12 * 60 * 60 * 1000;
const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 30_000;

const clientSessionId = process.env.COLLAB_CLIENT_SESSION_ID ?? 'default';
/** The Claude Code process this daemon serves, from the hook or MCP server that started it. */
const claudePid = Number(process.env.COLLAB_CLAUDE_PID) || undefined;
/** The session's working directory, from the hook (its stdin) or the MCP server (CLAUDE_PROJECT_DIR). */
const sessionCwd = process.env.COLLAB_CWD || process.cwd();
const logFile = path.join(sessionDir(clientSessionId), 'daemon.log');

function log(...parts: unknown[]): void {
  const line = `${new Date().toISOString()} ${parts.map((p) => (typeof p === 'string' ? p : JSON.stringify(p))).join(' ')}\n`;
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.appendFileSync(logFile, line);
  } catch { /* logging must never be fatal */ }
}

/** The socket could not carry a request at all, so HTTP may. A ServerError is an answer and is not retried. */
class SocketUnavailable extends Error {}

type Pending = { resolve: (response: Result['response']) => void; reject: (err: Error) => void; timer: NodeJS.Timeout };

class Daemon {
  private ws?: WebSocket;
  /** True once the server answered this socket's subscribe with `hello`: before
   *  that it rejects every other frame. */
  private subscribed = false;
  private reconnectDelay = RECONNECT_BASE_MS;
  private stopping = false;
  /** Set when the server refused this client for good: no more reconnects. */
  private fatal?: string;
  private nextRequestId = 1;
  private readonly pending = new Map<string, Pending>();
  private readonly waiters = new Set<() => void>();
  private readonly token = crypto.randomBytes(24).toString('base64url');
  /** The last subscribe asked the server where to start, so its hello sets the local cursor. */
  private freshHello = false;

  constructor(private readonly config: PluginConfig, private creds: Credentials, private readonly origin: Origin) {}

  async start(): Promise<void> {
    const port = await this.startLoopbackServer();
    writeDaemonInfo({
      pid: process.pid, port, token: this.token, startedAt: Date.now(), clientSessionId,
      cwd: sessionCwd, claudePid,
    });
    log('daemon started', { pid: process.pid, port, channel: this.creds.channel, topic: this.origin.topic });

    this.connect();

    setInterval(() => this.heartbeat(), HEARTBEAT_SECONDS * 1000).unref();
    setInterval(() => this.watchdog(), 60_000).unref();
    setTimeout(() => this.shutdown('max lifetime reached'), MAX_LIFETIME_MS).unref();

    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.on(signal, () => this.shutdown(`received ${signal}`));
    }
  }

  /* ── WebSocket ────────────────────────────────────────────────────────── */

  private connect(): void {
    if (this.stopping || this.fatal) return;

    issueTicket(this.creds, this.origin)
      .then(({ ticket, wsEndpoint }) => {
        const url = `${wsEndpoint || this.creds.wsEndpoint}?ticket=${encodeURIComponent(ticket)}`;
        const ws = new WebSocket(url);
        this.ws = ws;

        ws.on('open', () => {
          this.reconnectDelay = RECONNECT_BASE_MS;
          log('connected');
          // The socket is useless until subscribed: the server answers with hello.
          const since = replayFrom();
          this.freshHello = since === undefined;
          ws.send(encodeFrame(subscribeFrame({ since, repo: process.env.COLLAB_REPO, branch: process.env.COLLAB_BRANCH })));
        });

        ws.on('message', (data) => this.onServerFrame(data.toString()));
        ws.on('close', (code) => {
          this.subscribed = false;
          this.failPending(new SocketUnavailable('the socket closed'));
          log('closed', { code });
          this.scheduleReconnect();
        });
        ws.on('error', (err) => { log('socket error', err.message); });
      })
      .catch((err: Error) => {
        log('ticket failed', err.message);
        const reason = err instanceof ApiError ? fatalReason(err.code, err.message) : undefined;
        if (reason) return this.markFatal(reason);
        writeLocalState(clientSessionId, { connected: false, lastError: err.message });
        this.scheduleReconnect();
      });
  }

  private scheduleReconnect(): void {
    if (this.stopping || this.fatal) return;
    writeLocalState(clientSessionId, { connected: false });
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(delay * 2, RECONNECT_MAX_MS);
    setTimeout(() => this.connect(), delay).unref();
  }

  /** Shown by the hooks and collab_status, so a closed socket says why. */
  private markFatal(reason: string): void {
    if (this.fatal) return;
    this.fatal = reason;
    this.subscribed = false;
    log('refused by the server, not reconnecting:', reason);
    writeLocalState(clientSessionId, { connected: false, lastError: reason, fatal: reason });
    try { this.ws?.close(); } catch { /* already gone */ }
  }

  private onServerFrame(text: string): void {
    let frame;
    try {
      frame = decodeServerFrame(text);
    } catch (err) {
      log('unreadable frame', (err as Error).message);
      return;
    }
    const helloApplied = handleServerFrame(frame, {
      clientSessionId,
      freshHello: this.freshHello,
      ingest: (message, { quiet }) => this.ingest(message, { quiet }),
      settle: (requestId, outcome) => {
        const pending = this.pending.get(requestId);
        if (!pending) return false;
        clearTimeout(pending.timer);
        this.pending.delete(requestId);
        if ('error' in outcome) pending.reject(outcome.error);
        else pending.resolve(outcome.response);
        return true;
      },
      fatal: (reason) => this.markFatal(reason),
      log,
    });
    if (helloApplied) {
      this.freshHello = false;
      this.subscribed = true;
    }
  }

  /**
   * Keeps whatever the server sends. It never sends a session its own
   * messages; one from this member came from another of its sessions.
   */
  private ingest(message: Message, { quiet = false } = {}): void {
    appendInbox(clientSessionId, message);
    for (const waiter of this.waiters) waiter();

    // Low-urgency bookkeeping (claims, context notices) should not buzz anyone.
    const worthAToast = !quiet && this.config.desktopNotifications
      && (message.type === 'done' || message.urgency === 'high');
    if (worthAToast) {
      notifyDesktop(
        message.type === 'done' ? `${message.fromName} finished a task` : `${message.fromName} says`,
        message.text,
      );
    }
  }

  private heartbeat(): void {
    // Keeps this member "online": presence goes stale without it.
    if (this.isOpen()) this.sendFrame({ case: 'heartbeat', value: {} });
    truncateInbox(clientSessionId);
  }

  /** Exits when the session that owns this daemon has clearly moved on. */
  private watchdog(): void {
    try {
      const info = JSON.parse(fs.readFileSync(path.join(sessionDir(clientSessionId), 'daemon.json'), 'utf8')) as { pid: number };
      if (info.pid !== process.pid) return this.shutdown('another daemon took over this session');
    } catch {
      return this.shutdown('daemon registration disappeared');
    }
    // A crash skips SessionEnd. Without this the daemon lingered for 12 hours,
    // and the MCP pairing by pid could match it to whatever process reused the pid.
    if (claudePid && !isAlive(claudePid)) this.shutdown('its Claude Code process exited');
  }

  private isOpen(): boolean {
    return this.subscribed && this.ws?.readyState === WebSocket.OPEN;
  }

  /** Fire and forget: no request id, so the server sends no result (errors still come). */
  private sendFrame(request: RequestInit): void {
    if (this.isOpen()) this.ws!.send(encodeFrame(clientFrame(request)));
  }

  private failPending(err: Error): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      this.pending.delete(id);
      pending.reject(err);
    }
  }

  /**
   * One unary call: over the socket when it is subscribed and the frame fits,
   * otherwise over HTTP, which carries every unary call too. An answer from the
   * server, error or not, is final; only a socket that could not carry the
   * request falls back.
   */
  private async request(init: RequestInit, timeoutMs = 10_000): Promise<Result['response']> {
    const requestId = `d${this.nextRequestId++}`;
    const frame = clientFrame(init, requestId);
    const request = frame.request;
    if (request.case === undefined || request.case === 'subscribe') throw new Error('not a unary request');

    const text = encodeFrame(frame);
    if (this.isOpen() && Buffer.byteLength(text) <= WS_FRAME_LIMIT_BYTES) {
      try {
        return await new Promise<Result['response']>((resolve, reject) => {
          const timer = setTimeout(() => {
            this.pending.delete(requestId);
            reject(new SocketUnavailable('timed out waiting for the server'));
          }, timeoutMs);
          this.pending.set(requestId, { resolve, reject, timer });
          this.ws!.send(text);
        });
      } catch (err) {
        if (!(err instanceof SocketUnavailable)) throw err;
        log('socket request failed, falling back to HTTP', err.message);
      }
    }
    return this.overHttp(() => channelViaHttp(this.creds, this.origin, request));
  }

  /** An HTTP call on the socket's behalf. A refusal no retry can fix stops the reconnects too. */
  private async overHttp<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (err) {
      const reason = err instanceof ApiError ? fatalReason(err.code, err.message) : undefined;
      if (reason) this.markFatal(reason);
      throw err;
    }
  }

  /* ── Loopback API ─────────────────────────────────────────────────────── */

  private startLoopbackServer(): Promise<number> {
    const server = http.createServer((req, res) => {
      this.handleRequest(req, res).catch((err: Error) => {
        respond(res, 500, { error: err.message });
      });
    });

    return new Promise((resolve, reject) => {
      // Loopback only: this API speaks for the session, so it must never be
      // reachable from outside the machine. The token guards against other
      // local users hitting the port.
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (address && typeof address === 'object') resolve(address.port);
        else reject(new Error('could not determine loopback port'));
      });
      server.on('error', reject);
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (req.headers['x-collab-token'] !== this.token) return respond(res, 401, { error: 'bad token' });

    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const body = await readBody(req) as Record<string, unknown>;

    switch (`${req.method} ${url.pathname}`) {
      case 'GET /status':
        return respond(res, 200, {
          ...readLocalState(clientSessionId),
          // Live socket state wins over whatever the last snapshot recorded.
          connected: this.isOpen(),
          cursor: readCursor(clientSessionId),
          channel: this.creds.channel,
          self: this.creds.memberId,
          displayName: this.creds.displayName,
          topic: this.origin.topic,
        });

      case 'POST /send':
        return respond(res, 200, await this.send(body as unknown as OutgoingMessage));

      case 'POST /ack': {
        const cursor = Math.max(0, Math.trunc(Number(body.cursor ?? 0)) || 0);
        // Hooks and the channel push both ack; a late ack for an older seq must
        // not pull the cursor back and re-deliver what came after it.
        const current = readCursor(clientSessionId);
        writeCursor(clientSessionId, { delivered: Math.max(current.delivered, cursor), acked: Math.max(current.acked, cursor) });
        if (this.isOpen()) this.sendFrame({ case: 'ack', value: { cursor } });
        else await ackViaHttp(this.creds, this.origin, cursor).catch((err: Error) => log('offline ack failed', err.message));
        return respond(res, 200, { ok: true });
      }

      case 'GET /wait': {
        const timeoutMs = Math.min(600_000, Number(url.searchParams.get('timeoutMs') ?? 60_000));
        const types = (url.searchParams.get('types') ?? '').split(',').filter(Boolean);
        const minUrgency = url.searchParams.get('minUrgency') as Urgency | null;
        const sinceParam = url.searchParams.get('since');
        // Without `since`, only what arrives from now on counts.
        const since = sinceParam !== null ? Number(sinceParam) : (readInbox(clientSessionId).at(-1)?.seq ?? 0);
        // A caller that gives up must not leave a waiter behind until the timeout.
        const abort = new AbortController();
        res.on('close', () => abort.abort());
        const { messages, trigger } = await this.waitForMessages({
          since, timeoutMs, types,
          minUrgency: minUrgency && minUrgency in URGENCY_RANK ? minUrgency : undefined,
          signal: abort.signal,
        });
        return respond(res, 200, { message: trigger, messages });
      }

      case 'POST /claim': {
        const response = await this.request({
          case: 'claim',
          value: {
            paths: Array.isArray(body.paths) ? body.paths.map(String) : [],
            note: typeof body.note === 'string' ? body.note : '',
            ttlSeconds: typeof body.ttlSeconds === 'number' ? Math.max(0, Math.round(body.ttlSeconds)) : 0,
          },
        });
        if (response.case !== 'claim' || !response.value.claim) throw new Error('unexpected answer to a claim');
        return respond(res, 200, toClaim(response.value.claim));
      }

      case 'POST /release': {
        const response = await this.request({ case: 'release', value: { claimId: String(body.claimId ?? '') } });
        if (response.case !== 'release') throw new Error('unexpected answer to a release');
        return respond(res, 200, { released: response.value.released });
      }

      case 'POST /context': {
        const response = await this.request({
          case: 'putContext',
          value: {
            key: String(body.key ?? ''), title: String(body.title ?? ''),
            summary: String(body.summary ?? ''), body: String(body.body ?? ''),
          },
        });
        if (response.case !== 'putContext' || !response.value.entry) throw new Error('unexpected answer to a context write');
        return respond(res, 200, toContextEntry(response.value.entry));
      }

      case 'GET /context': {
        const version = Number(url.searchParams.get('version'));
        const response = await this.request({
          case: 'getContext',
          value: {
            key: url.searchParams.get('key') ?? '',
            ...(Number.isInteger(version) && version > 0 ? { version } : {}),
            topic: url.searchParams.get('topic') ?? '',
          },
        });
        if (response.case !== 'getContext' || !response.value.entry) throw new Error('unexpected answer to a context read');
        return respond(res, 200, toContextEntry(response.value.entry));
      }

      case 'POST /presence':
        this.sendFrame({
          case: 'setPresence',
          value: {
            status: body.status === 'idle' ? MemberStatus.IDLE : MemberStatus.ONLINE,
            repo: typeof body.repo === 'string' ? body.repo : '',
            branch: typeof body.branch === 'string' ? body.branch : '',
          },
        });
        return respond(res, 200, { ok: true });

      case 'POST /shutdown':
        respond(res, 200, { ok: true });
        setTimeout(() => this.shutdown('session ended'), 50);
        return;

      default:
        return respond(res, 404, { error: 'unknown endpoint' });
    }
  }

  /** Prefers the socket, falls back to plain HTTP so a send never just fails. */
  private async send(message: OutgoingMessage): Promise<unknown> {
    const request = toSendRequest(message);
    if (!this.isOpen()) return toSendResult(await this.overHttp(() => sendViaHttp(this.creds, this.origin, request)));
    const response = await this.request({ case: 'send', value: request });
    if (response.case !== 'send') throw new Error('unexpected answer to a send');
    return toSendResult(response.value);
  }

  /**
   * Long-poll over the inbox. Resolves at once when something past `since`
   * already matches, so a message that landed between two polls is never lost;
   * otherwise waits for the next matching arrival. A timeout returns nothing.
   */
  private waitForMessages(options: {
    since: number; timeoutMs: number; types: string[]; minUrgency?: Urgency; signal: AbortSignal;
  }): Promise<{ messages: Message[]; trigger?: Message }> {
    const check = () => messagesSince(clientSessionId, options.since, { types: options.types, minUrgency: options.minUrgency });

    const ready = check();
    if (ready.trigger) return Promise.resolve(ready);

    return new Promise((resolve) => {
      const done = (result: { messages: Message[]; trigger?: Message }) => {
        clearTimeout(timer);
        this.waiters.delete(listener);
        options.signal.removeEventListener('abort', onAbort);
        resolve(result);
      };
      const listener = () => {
        const result = check();
        if (result.trigger) done(result);
      };
      const onAbort = () => done({ messages: [] });
      const timer = setTimeout(() => done({ messages: [] }), options.timeoutMs);
      this.waiters.add(listener);
      options.signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  private shutdown(reason: string): void {
    if (this.stopping) return;
    this.stopping = true;
    log('shutting down', reason);
    try { this.ws?.close(); } catch { /* already gone */ }
    clearDaemonInfo(clientSessionId);
    setTimeout(() => process.exit(0), 100).unref();
  }
}

/**
 * Where a replay starts: past everything this session already has. Undefined
 * for a session that has nothing yet, so the server starts it at this member's
 * cursor in the topic instead of at the beginning of the channel.
 */
function replayFrom(): number | undefined {
  const since = Math.max(readCursor(clientSessionId).acked, readInbox(clientSessionId).at(-1)?.seq ?? 0);
  return since > 0 ? since : undefined;
}

/**
 * The topic this session joined. A daemon the MCP server restarts (after the
 * 12 h cap, or a crash) keeps it, even if the environment it starts in says
 * otherwise: a session does not change topic halfway.
 */
function sessionTopic(config: PluginConfig): string {
  return readLocalState(clientSessionId).topic || resolveTopic(config, sessionCwd);
}

function respond(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) });
  res.end(payload);
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

/**
 * Turns the configured one-shot invite into durable credentials. Two sessions
 * can start at the same moment, so the first one to take the lock joins and the
 * rest wait for the credentials file it writes.
 */
async function ensureCredentials(config: PluginConfig): Promise<Credentials> {
  const existing = resolveCredentials(config);
  if (existing?.memberId && existing.secret) return existing;

  if (!config.apiEndpoint) throw new Error('collab-channel: api_endpoint is not configured (run /config)');
  if (!config.inviteCode) throw new Error('collab-channel: no credentials and no invite_code to redeem (run /config)');

  fs.mkdirSync(dataDir(), { recursive: true });
  const lock = path.join(dataDir(), 'join.lock');
  let owned = false;
  try {
    fs.writeFileSync(lock, String(process.pid), { flag: 'wx' });
    owned = true;
  } catch {
    // Someone else is joining; wait for the credentials they are about to write.
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const creds = resolveCredentials(config);
      if (creds?.secret) return creds;
    }
    throw new Error('collab-channel: timed out waiting for another session to redeem the invite');
  }

  try {
    const joined = await join(config.apiEndpoint, config.inviteCode, config.displayName);
    const creds: Credentials = {
      apiEndpoint: config.apiEndpoint,
      wsEndpoint: joined.wsEndpoint,
      memberId: joined.memberId,
      secret: joined.secret,
      channel: joined.channel,
      displayName: joined.displayName,
      handle: joined.handle,
      joinedAt: Date.now(),
    };
    writeCredentials(creds);
    log('joined channel', { channel: creds.channel, memberId: creds.memberId });
    return creds;
  } finally {
    if (owned) { try { fs.unlinkSync(lock); } catch { /* ignore */ } }
  }
}

async function main(): Promise<void> {
  const config = readConfig();
  const creds = await ensureCredentials(config);
  const origin: Origin = { topic: sessionTopic(config), clientSessionId };
  writeLocalState(clientSessionId, { topic: origin.topic });

  // A first run has no snapshot; seed one over HTTP so hooks have something to
  // show even before the socket finishes its handshake.
  await fetchState(creds, origin, replayFrom())
    .then((wire) => {
      const state = toSnapshot(wire);
      writeLocalState(clientSessionId, {
        channel: state.channel, self: state.self, handle: state.handle, members: state.members,
        claims: state.claims, contextIndex: state.contextIndex, latestSeq: state.latestSeq,
      });
    })
    .catch((err: Error) => log('initial state fetch failed', err.message));

  await new Daemon(config, creds, origin).start();
}

main().catch((err: Error) => {
  log('fatal', err.message);
  writeLocalState(clientSessionId, { connected: false, lastError: err.message });
  process.exit(1);
});
