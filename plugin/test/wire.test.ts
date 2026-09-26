import { describe, expect, it } from 'vitest';
import frames from '@collab/protocol/vectors/frames.json';
import { decodeServerFrame, encodeFrame, clientFrame } from '../src/lib/frames.js';
import { toMember, toMessage, toSendRequest } from '../src/lib/wire.js';

/** A ServerFrame from the protocol vectors, decoded the way the daemon decodes one off the socket. */
function vectorFrame(name: string) {
  const found = frames.cases.find((c) => c.name === name);
  if (!found) throw new Error(`No vector "${name}"`);
  return decodeServerFrame(JSON.stringify(found.json)).frame;
}

const sendJson = (message: Parameters<typeof toSendRequest>[0]) =>
  JSON.parse(encodeFrame(clientFrame({ case: 'send', value: toSendRequest(message) }, 'r2')));

describe('what the tools send, on the wire', () => {
  it('is the canonical frame of the protocol vectors for a done notice', () => {
    // Same frame as collab-protocol vectors/frames.json, "send a done notice to one member in one topic".
    expect(sendJson({
      type: 'done', text: 'Finished: split the repos', to: { handle: 'willy', topic: 'collab-producto' },
      urgency: 'high', refs: ['README.md'], done: { task: 'split the repos' },
    })).toEqual({
      requestId: 'r2',
      send: {
        type: 'MESSAGE_TYPE_DONE',
        text: 'Finished: split the repos',
        to: { handle: 'willy', topic: 'collab-producto' },
        urgency: 'URGENCY_HIGH',
        refs: ['README.md'],
        done: { task: 'split the repos' },
      },
    });
  });

  it('is the canonical frame of the protocol vectors for a question to one session', () => {
    // Same frame as collab-protocol vectors/frames.json, "send a question to one session of a member".
    const vector = frames.cases.find((c) => c.name === 'send a question to one session of a member')!.json;
    expect(JSON.parse(encodeFrame(clientFrame({
      case: 'send',
      value: toSendRequest({
        type: 'question', text: '¿Ya subiste la rama?', to: { handle: 'willy', clientSessionId: '3f2a91c0-5b1e-4c0a-9d7e-2f6a1b3c4d5e' },
      }),
    }, 'r4')))).toEqual(vector);
  });

  it('leaves type and urgency unset when the caller did, so the server applies its defaults', () => {
    expect(sendJson({ text: 'hola', to: { topic: 't1' } })).toEqual({ requestId: 'r2', send: { text: 'hola', to: { topic: 't1' } } });
  });

  it('sends a done payload only with type done', () => {
    expect(sendJson({ type: 'note', text: 'x', to: { topic: 't' }, done: { task: 'x' } }).send.done).toBeUndefined();
  });

  it('marks the automatic notice of a finished task', () => {
    expect(sendJson({ type: 'done', text: 'Finished: x', to: { topic: 't' }, done: { task: 'x', automatic: true } }).send.done)
      .toEqual({ task: 'x', automatic: true });
  });
});

describe('what the server sends, in the plugin\'s own shapes', () => {
  it('keeps the session a message came from and the one it is for', () => {
    const frame = vectorFrame('a message pushed to one session, saying which session sent it');
    if (frame.case !== 'message') throw new Error('not a message');
    expect(toMessage(frame.value)).toMatchObject({
      fromHandle: 'carlos',
      fromClientSessionId: '64bc4a7f-dd57-480d-ab11-d8cb48417276',
      to: { handle: 'willy', clientSessionId: '3f2a91c0-5b1e-4c0a-9d7e-2f6a1b3c4d5e' },
    });
  });

  it('lists each session of a member with where it works', () => {
    const frame = vectorFrame('presence of a member with two sessions in the same topic');
    if (frame.case !== 'presence') throw new Error('not presence');
    expect(toMember(frame.value.members[0]!).sessions).toEqual([
      {
        clientSessionId: '3f2a91c0-5b1e-4c0a-9d7e-2f6a1b3c4d5e', topic: 'beta-1.0', repo: 'collab-plugin', branch: 'main',
        connectedAt: Date.parse('2026-09-25T17:00:00Z'),
      },
      {
        clientSessionId: 'a81b77d2-0c4f-4e7a-8b1d-6e9f0a2b3c4d', topic: 'beta-1.0', repo: 'collab-plugin', branch: 'feat/sesiones',
        connectedAt: Date.parse('2026-09-25T19:25:00Z'),
      },
    ]);
  });

  it('reads a message from an older server, without a session, as before', () => {
    const frame = vectorFrame('a message pushed to a recipient');
    if (frame.case !== 'message') throw new Error('not a message');
    const message = toMessage(frame.value);
    expect(message.fromClientSessionId).toBeUndefined();
    expect(message.to).toEqual({ memberId: '01K6D2R1B7C4M9P2X5Q8T3V6WA', handle: 'carlos' });
  });
});
