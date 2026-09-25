import { describe, expect, it } from 'vitest';
import { encodeFrame, clientFrame } from '../src/lib/frames.js';
import { toSendRequest } from '../src/lib/wire.js';

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
