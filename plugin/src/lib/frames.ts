import {
  ClientFrameSchema, create, decode, encode, ErrorCode, formatVersion, PROTOCOL, ServerFrameSchema,
  type ClientFrame, type MessageInitShape, type Result, type ServerFrame,
} from '@collab/protocol';
import { PLUGIN_NAME } from './channel.js';
import type { Message } from './model.js';
import { applyTaskList, readCursor, readLocalState, writeCursor, writeLocalState } from './state.js';
import { PLUGIN_VERSION } from './version.js';
import { toClaim, toContextSummary, toMember, toMessage, toSnapshot } from './wire.js';

/**
 * The WebSocket binding as the daemon speaks it (collab-protocol,
 * bindings/websocket.md), kept apart from the socket itself so it can be tested
 * without a network: building frames, and applying what the server sends.
 */

export type RequestInit = NonNullable<MessageInitShape<typeof ClientFrameSchema>['request']>;

/** API Gateway rejects WebSocket messages over 128 KB; past this, a request goes over HTTP. */
export const WS_FRAME_LIMIT_BYTES = 120_000;

export function clientFrame(request: RequestInit, requestId = ''): ClientFrame {
  return create(ClientFrameSchema, { requestId, request });
}

export function encodeFrame(frame: ClientFrame): string {
  return encode(ClientFrameSchema, frame);
}

export function decodeServerFrame(text: string): ServerFrame {
  return decode(ServerFrameSchema, text);
}

/** The first frame on every socket: who this client is, and where the replay starts. */
export function subscribeFrame(options: { since?: number; repo?: string; branch?: string }): ClientFrame {
  return clientFrame({
    case: 'subscribe',
    value: {
      client: { name: PLUGIN_NAME, version: PLUGIN_VERSION, protocol: PROTOCOL, capabilities: [] },
      ...(options.since === undefined ? {} : { since: options.since }),
      repo: options.repo ?? '',
      branch: options.branch ?? '',
    },
  });
}

/**
 * The errors no reconnect can fix, as the line the hooks and collab_status show.
 * Anything else is transient or belongs to one request.
 */
export function fatalReason(code: ErrorCode, message: string): string | undefined {
  switch (code) {
    case ErrorCode.UNSUPPORTED_PROTOCOL:
      return `the channel backend does not speak this plugin's protocol (collab.v1, ${formatVersion(PROTOCOL)}): `
        + `${message}. Update collab-channel, or point api_endpoint at a 1.0 backend.`;
    case ErrorCode.REVOKED:
      return `this member was revoked on the channel (${message}). Ask whoever runs it for a new invite.`;
    default:
      return undefined;
  }
}

/** An error frame the server sent in answer to a request. */
export class ServerError extends Error {
  constructor(readonly code: ErrorCode, message: string) {
    super(`${ErrorCode[code] ?? 'INTERNAL'}: ${message}`);
  }
}

export interface FrameContext {
  clientSessionId: string;
  /** The subscribe named no `since`, so the hello's cursor becomes the local one. */
  freshHello: boolean;
  /** Keeps a message: the inbox, waiters, a desktop toast. */
  ingest(message: Message, options: { quiet: boolean }): void;
  /** Hands a result or an error to the request waiting for it. False when none is. */
  settle(requestId: string, outcome: { response: Result['response'] } | { error: ServerError }): boolean;
  /** The server refused this client for good. */
  fatal(reason: string): void;
  log(...parts: unknown[]): void;
}

/** Applies one server frame. Returns true when it was the hello that completed a subscribe. */
export function handleServerFrame(frame: ServerFrame, ctx: FrameContext): boolean {
  const id = ctx.clientSessionId;
  const event = frame.frame;
  switch (event.case) {
    case 'hello': {
      if (!event.value.state) {
        ctx.log('hello without state');
        return false;
      }
      const state = toSnapshot(event.value.state);
      // A session with nothing of its own starts where the server said this
      // member had read up to in this topic; everything before is read.
      if (ctx.freshHello) {
        const cursor = readCursor(id);
        writeCursor(id, { delivered: Math.max(cursor.delivered, state.cursor), acked: Math.max(cursor.acked, state.cursor) });
      }
      // Replay first, and only then say connected: SessionStart waits for that
      // flag and then reads the inbox, which must be complete by then.
      for (const message of state.messages) ctx.ingest(message, { quiet: true });
      const protocol = event.value.protocol ? formatVersion(event.value.protocol) : '?';
      writeLocalState(id, {
        connected: true, channel: state.channel, self: state.self, handle: state.handle, topic: state.topic,
        members: state.members, claims: state.claims, contextIndex: state.contextIndex, taskLists: state.taskLists,
        latestSeq: state.latestSeq, lastError: undefined, fatal: undefined,
        server: `${event.value.serverVersion || 'unknown'} (protocol ${protocol})`,
      });
      return true;
    }

    case 'message': {
      const message = toMessage(event.value);
      ctx.ingest(message, { quiet: false });
      writeLocalState(id, { latestSeq: Math.max(readLocalState(id).latestSeq, message.seq) });
      // Task notices carry their list's counts, which is what keeps the summary current.
      if (message.task) applyTaskList(id, message.task.list);
      return false;
    }

    case 'presence':
      writeLocalState(id, { members: event.value.members.map(toMember) });
      return false;

    case 'claims': {
      // Only sessions in the topic get it; a stray one for another topic changes nothing here.
      const topic = readLocalState(id).topic;
      if (event.value.topic && topic && event.value.topic !== topic) return false;
      writeLocalState(id, { claims: event.value.claims.map(toClaim) });
      return false;
    }

    case 'context': {
      const entry = toContextSummary(event.value);
      const index = readLocalState(id).contextIndex.filter((e) => e.key !== entry.key);
      writeLocalState(id, { contextIndex: [entry, ...index] });
      return false;
    }

    case 'result':
      if (event.value.requestId) ctx.settle(event.value.requestId, { response: event.value.response });
      return false;

    case 'error': {
      const { code, message, requestId } = event.value;
      // Checked first: REVOKED can arrive as the answer to any request.
      const reason = fatalReason(code, message);
      if (reason) ctx.fatal(reason);
      if (requestId && ctx.settle(requestId, { error: new ServerError(code, message) })) return false;
      if (!reason) ctx.log('server error', ErrorCode[code] ?? code, message);
      return false;
    }

    default:
      // A frame kind from a later minor: ignoring it is what keeps minors compatible.
      return false;
  }
}
