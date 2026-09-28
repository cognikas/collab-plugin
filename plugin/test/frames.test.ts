import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorCode } from '@collab/protocol';
import { isFatal } from '../src/lib/api.js';
import {
  decodeServerFrame, encodeFrame, handleServerFrame, ServerError, subscribeFrame, type FrameContext,
} from '../src/lib/frames.js';
import type { Message } from '../src/lib/model.js';
import { readCursor, readLocalState, writeCursor, writeLocalState } from '../src/lib/state.js';
import { PLUGIN_VERSION } from '../src/lib/version.js';

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collab-frames-'));
  process.env.CLAUDE_PLUGIN_DATA = tempDir;
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
  delete process.env.CLAUDE_PLUGIN_DATA;
});

/** A fake daemon side: records what the handler asks of it. */
function context(overrides: Partial<FrameContext> = {}) {
  const ingested: Array<{ message: Message; quiet: boolean }> = [];
  const settled: Array<{ requestId: string; outcome: unknown }> = [];
  const fatal: string[] = [];
  const ctx: FrameContext = {
    clientSessionId: 's1',
    freshHello: false,
    ingest: (message, { quiet }) => { ingested.push({ message, quiet }); },
    settle: (requestId, outcome) => { settled.push({ requestId, outcome }); return true; },
    fatal: (reason) => { fatal.push(reason); },
    log: vi.fn(),
    ...overrides,
  };
  return { ctx, ingested, settled, fatal };
}

const frame = (json: unknown) => decodeServerFrame(JSON.stringify(json));

const WILLY = '01K6D2Q7ZJ9XH3V5W8N4T2R6YB';
const CARLOS = '01K6D2R1B7C4M9P2X5Q8T3V6WA';

const helloJson = {
  hello: {
    state: {
      channel: 'cognikas-dev', selfMemberId: CARLOS, handle: 'carlos', topic: 'collab-global',
      members: [{
        memberId: WILLY, displayName: 'Willy', handle: 'willy', status: 'MEMBER_STATUS_ONLINE',
        connections: 1, topics: ['collab-producto'], lastSeenAt: '2026-09-25T18:00:00Z',
      }],
      claims: [{
        claimId: 'c1', ownerMemberId: WILLY, ownerName: 'Willy', topic: 'collab-global', paths: ['docs/**'],
        createdAt: '2026-09-25T18:00:00Z', expiresAt: '2026-09-25T20:00:00Z',
      }],
      contextIndex: [{ key: 'canal-fase-1', version: 2, title: 'Canal fase 1', summary: 'Qué cambia', authorName: 'Willy', createdAt: '2026-09-24T12:00:00Z' }],
      messages: [{
        seq: 52, channel: 'cognikas-dev', fromMemberId: WILLY, fromName: 'Willy', fromHandle: 'willy', fromTopic: 'collab-producto',
        to: { memberId: CARLOS, handle: 'carlos' }, type: 'MESSAGE_TYPE_NOTE', text: 'hola', urgency: 'URGENCY_NORMAL',
        sentAt: '2026-09-25T17:02:11.123Z',
      }],
      cursor: 51,
      latestSeq: 53,
    },
    protocol: { major: 1 },
    serverVersion: '1.0.0',
  },
};

describe('subscribing', () => {
  it('says who this client is, and which protocol it speaks', () => {
    const json = JSON.parse(encodeFrame(subscribeFrame({ repo: 'collab-global', branch: 'main' })));
    expect(json).toEqual({
      subscribe: {
        client: { name: 'collab-channel', version: PLUGIN_VERSION, protocol: { major: 1 } },
        repo: 'collab-global',
        branch: 'main',
      },
    });
  });

  it('names `since` only when there is a replay point, so a fresh session starts at its cursor', () => {
    expect(JSON.parse(encodeFrame(subscribeFrame({}))).subscribe.since).toBeUndefined();
    expect(JSON.parse(encodeFrame(subscribeFrame({ since: 51 }))).subscribe.since).toBe(51);
  });
});

describe('hello', () => {
  it('writes the snapshot in the plugin\'s shapes and replays quietly', () => {
    const { ctx, ingested } = context();
    expect(handleServerFrame(frame(helloJson), ctx)).toBe(true);

    const state = readLocalState('s1');
    expect(state.connected).toBe(true);
    expect(state.self).toBe(CARLOS);
    expect(state.topic).toBe('collab-global');
    expect(state.members[0]).toMatchObject({ handle: 'willy', status: 'online', topics: ['collab-producto'] });
    expect(state.members[0]?.lastSeenAt).toBe(Date.parse('2026-09-25T18:00:00Z'));
    expect(state.claims[0]).toMatchObject({ claimId: 'c1', ownerMemberId: WILLY, paths: ['docs/**'] });
    expect(state.contextIndex[0]).toMatchObject({ key: 'canal-fase-1', version: 2 });
    expect(state.latestSeq).toBe(53);
    expect(state.server).toBe('1.0.0 (protocol 1.0)');

    expect(ingested).toHaveLength(1);
    expect(ingested[0]).toMatchObject({ quiet: true, message: { seq: 52, type: 'note', urgency: 'normal', to: { handle: 'carlos' } } });
    expect(ingested[0]?.message.sentAt).toBe(Date.parse('2026-09-25T17:02:11.123Z'));
  });

  it('starts a fresh session at the member\'s cursor, never behind what it has', () => {
    handleServerFrame(frame(helloJson), context({ freshHello: true }).ctx);
    expect(readCursor('s1')).toMatchObject({ delivered: 51, acked: 51 });

    writeCursor('s1', { delivered: 60, acked: 60 });
    handleServerFrame(frame(helloJson), context({ freshHello: true }).ctx);
    expect(readCursor('s1')).toMatchObject({ delivered: 60, acked: 60 });
  });

  it('leaves the cursor alone when the subscribe named where to start', () => {
    handleServerFrame(frame(helloJson), context({ freshHello: false }).ctx);
    expect(readCursor('s1').delivered).toBe(0);
  });

  it('marks the cached tasks as behind, since a hello brings the lists\' counts but not the tasks', () => {
    writeLocalState('s1', { tasksStale: false });
    handleServerFrame(frame(helloJson), context().ctx);
    expect(readLocalState('s1').tasksStale).toBe(true);
  });

  it('clears an earlier error once the server says hello', () => {
    writeLocalState('s1', { lastError: 'ticket failed', fatal: 'old' });
    handleServerFrame(frame(helloJson), context().ctx);
    expect(readLocalState('s1').lastError).toBeUndefined();
    expect(readLocalState('s1').fatal).toBeUndefined();
  });
});

describe('events', () => {
  it('turns a pushed message into the plugin\'s shape, payload included', () => {
    const { ctx, ingested } = context();
    handleServerFrame(frame({
      message: {
        seq: 60, channel: 'cognikas-dev', fromMemberId: WILLY, fromName: 'Willy', fromHandle: 'willy', fromTopic: 'collab-global',
        to: { topic: 'collab-global' }, type: 'MESSAGE_TYPE_DONE', text: 'Finished: x', urgency: 'URGENCY_HIGH',
        refs: ['a.ts'], sentAt: '2026-09-25T18:00:00Z', done: { task: 'x', automatic: true },
      },
    }), ctx);
    expect(ingested[0]).toMatchObject({
      quiet: false,
      message: { seq: 60, type: 'done', urgency: 'high', refs: ['a.ts'], done: { task: 'x', automatic: true }, to: { topic: 'collab-global' } },
    });
    expect(readLocalState('s1').latestSeq).toBe(60);
  });

  it('reads a message with unset enums as a normal note', () => {
    const { ctx, ingested } = context();
    handleServerFrame(frame({ message: { seq: 1, text: 'x', to: { topic: 't' } } }), ctx);
    expect(ingested[0]?.message).toMatchObject({ type: 'note', urgency: 'normal', sentAt: 0 });
  });

  it('replaces the member list on presence', () => {
    handleServerFrame(frame({ presence: { members: [{ memberId: WILLY, handle: 'willy', status: 'MEMBER_STATUS_IDLE' }] } }), context().ctx);
    expect(readLocalState('s1').members).toEqual([expect.objectContaining({ handle: 'willy', status: 'idle', connections: 0 })]);
  });

  it('takes the claim list of its own topic and ignores another topic\'s', () => {
    writeLocalState('s1', { topic: 'collab-global' });
    handleServerFrame(frame({ claims: { topic: 'elsewhere', claims: [{ claimId: 'x', paths: ['a'] }] } }), context().ctx);
    expect(readLocalState('s1').claims).toEqual([]);
    handleServerFrame(frame({ claims: { topic: 'collab-global', claims: [{ claimId: 'c2', paths: ['b'] }] } }), context().ctx);
    expect(readLocalState('s1').claims.map((c) => c.claimId)).toEqual(['c2']);
  });

  it('puts a new context version first and drops the older one of the same key', () => {
    writeLocalState('s1', { contextIndex: [
      { key: 'a', version: 1, title: 'A', summary: '', authorName: 'w', createdAt: 1 },
      { key: 'b', version: 1, title: 'B', summary: '', authorName: 'w', createdAt: 1 },
    ] });
    handleServerFrame(frame({ context: { key: 'b', version: 2, title: 'B2' } }), context().ctx);
    expect(readLocalState('s1').contextIndex.map((e) => `${e.key}v${e.version}`)).toEqual(['bv2', 'av1']);
  });

  it('keeps the topic\'s task lists from hello, then from each task notice', () => {
    const list = (key: string, counts: object, at: string, topic = 'collab-global') => ({
      key, topic, title: key, createdByName: 'Carlos', createdAt: '2026-09-27T19:00:00Z', updatedAt: at, ...counts,
    });
    const notice = (l: object, seq: number) => frame({
      message: {
        seq, channel: 'cognikas-dev', fromMemberId: WILLY, fromName: 'Willy', fromHandle: 'willy', fromTopic: 'collab-global',
        to: { topic: 'collab-global', includeSender: true }, type: 'MESSAGE_TYPE_TASK', text: 'Willy took rc5#1', urgency: 'URGENCY_LOW',
        sentAt: '2026-09-27T20:05:00Z', task: { list: l, numbers: [1], event: 'TASK_EVENT_CHECKED_OUT' },
      },
    });

    handleServerFrame(frame({
      hello: { ...helloJson.hello, state: { ...helloJson.hello.state, taskLists: [list('rc5', { open: 2 }, '2026-09-27T20:00:00Z')] } },
    }), context().ctx);
    expect(readLocalState('s1').taskLists).toMatchObject([{ key: 'rc5', open: 2, inProgress: 0 }]);

    const { ctx, ingested } = context();
    handleServerFrame(notice(list('rc5', { open: 1, inProgress: 1 }, '2026-09-27T20:05:00Z'), 60), ctx);
    expect(ingested[0]?.message).toMatchObject({ type: 'task', task: { event: 'checked_out', numbers: [1] } });
    expect(readLocalState('s1').taskLists).toMatchObject([{ key: 'rc5', open: 1, inProgress: 1 }]);

    // A new list goes first, one of another topic changes nothing, and one with nothing open drops out.
    handleServerFrame(notice(list('beta', { open: 3 }, '2026-09-27T20:10:00Z'), 61), context().ctx);
    handleServerFrame(notice(list('other', { open: 1 }, '2026-09-27T20:11:00Z', 'elsewhere'), 62), context().ctx);
    expect(readLocalState('s1').taskLists.map((l) => l.key)).toEqual(['beta', 'rc5']);
    handleServerFrame(notice(list('rc5', { done: 2 }, '2026-09-27T20:20:00Z'), 63), context().ctx);
    expect(readLocalState('s1').taskLists.map((l) => l.key)).toEqual(['beta']);

    // A notice that arrives late never rolls a list back.
    handleServerFrame(notice(list('beta', { open: 9 }, '2026-09-27T20:00:00Z'), 64), context().ctx);
    expect(readLocalState('s1').taskLists[0]?.open).toBe(3);
  });

  it('ignores a frame kind from a later minor instead of failing', () => {
    const { ctx, ingested, fatal } = context();
    const later = frame({ decision: { id: 'd1' } });
    expect(later.frame.case).toBeUndefined();
    expect(handleServerFrame(later, ctx)).toBe(false);
    expect(ingested).toEqual([]);
    expect(fatal).toEqual([]);
  });
});

describe('results and errors', () => {
  it('hands a typed result to the request that asked', () => {
    const { ctx, settled } = context();
    handleServerFrame(frame({ result: { requestId: 'd7', send: { seq: 53, delivered: 1 } } }), ctx);
    expect(settled).toHaveLength(1);
    const outcome = settled[0]!.outcome as { response: { case: string; value: { seq: number; delivered: number; deliveredOffline: boolean } } };
    expect(settled[0]!.requestId).toBe('d7');
    expect(outcome.response.case).toBe('send');
    expect(outcome.response.value).toMatchObject({ seq: 53, delivered: 1, deliveredOffline: false });
  });

  it('rejects the request an error answers, and nothing more', () => {
    const { ctx, settled, fatal } = context();
    handleServerFrame(frame({ error: { code: 'ERROR_CODE_UNKNOWN_HANDLE', message: 'No member with that handle', requestId: 'd8' } }), ctx);
    const error = (settled[0]!.outcome as { error: ServerError }).error;
    expect(error).toBeInstanceOf(ServerError);
    expect(error.code).toBe(ErrorCode.UNKNOWN_HANDLE);
    expect(error.message).toBe('UNKNOWN_HANDLE: No member with that handle');
    expect(fatal).toEqual([]);
  });

  it('stops for good on a protocol the server does not speak, with a line that says what to do', () => {
    const { ctx, fatal } = context();
    handleServerFrame(frame({ error: { code: 'ERROR_CODE_UNSUPPORTED_PROTOCOL', message: 'This server speaks collab.v2' } }), ctx);
    expect(fatal).toHaveLength(1);
    expect(fatal[0]).toContain('collab.v1');
    expect(fatal[0]).toContain('This server speaks collab.v2');
    expect(fatal[0]).toContain('Update collab-channel');
  });

  it('treats a revocation as final even when it answers a request', () => {
    const { ctx, fatal, settled } = context();
    handleServerFrame(frame({ error: { code: 'ERROR_CODE_REVOKED', message: 'revoked', requestId: 'd9' } }), ctx);
    expect(fatal[0]).toContain('revoked');
    expect(settled.map((s) => s.requestId)).toEqual(['d9']);
  });

  it('logs an error nobody is waiting for', () => {
    const log = vi.fn();
    const { ctx } = context({ log, settle: () => false });
    handleServerFrame(frame({ error: { code: 'ERROR_CODE_BAD_REQUEST', message: 'subscribe first' } }), ctx);
    expect(log).toHaveBeenCalledWith('server error', 'BAD_REQUEST', 'subscribe first');
  });

  it('knows which HTTP errors are final too', () => {
    expect(isFatal(ErrorCode.UNSUPPORTED_PROTOCOL)).toBe(true);
    expect(isFatal(ErrorCode.REVOKED)).toBe(true);
    expect(isFatal(ErrorCode.UNAUTHENTICATED)).toBe(false);
    expect(isFatal(ErrorCode.INTERNAL)).toBe(false);
  });
});
