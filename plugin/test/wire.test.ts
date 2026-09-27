import { describe, expect, it } from 'vitest';
import frames from '@collab/protocol/vectors/frames.json';
import { decodeServerFrame, encodeFrame, clientFrame } from '../src/lib/frames.js';
import { toMember, toMessage, toSendRequest, toTask, toTaskList } from '../src/lib/wire.js';

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

describe('task lists, on the wire', () => {
  it('a task notice carries its list, the tasks and what happened', () => {
    const frame = vectorFrame('the task notice the server writes, for the actor\'s other sessions too');
    if (frame.case !== 'message') throw new Error('not a message');
    expect(toMessage(frame.value)).toMatchObject({
      type: 'task',
      urgency: 'normal',
      task: {
        event: 'done',
        numbers: [1],
        list: { key: 'rc5', topic: 'collab-global', title: 'rc.5: seguimiento', open: 1, inProgress: 0, done: 1, dismissed: 0 },
      },
    });
  });

  it('a finished task keeps who did it and what they said', () => {
    const frame = vectorFrame('the answer to finishing a task');
    if (frame.case !== 'result' || frame.value.response.case !== 'updateTask') throw new Error('not an updateTask result');
    expect(toTask(frame.value.response.value.task!)).toEqual({
      list: 'rc5',
      topic: 'collab-global',
      number: 1,
      title: 'Probar el watchdog en vivo',
      status: 'done',
      createdByMemberId: '01K6D2R1B7C4M9P2X5Q8T3V6WA',
      createdByName: 'Carlos',
      createdAt: Date.parse('2026-09-27T20:00:00Z'),
      holder: {
        memberId: '01K6D2Q7ZJ9XH3V5W8N4T2R6YB', handle: 'willy', name: 'Willy',
        clientSessionId: '3f2a91c0-5b1e-4c0a-9d7e-2f6a1b3c4d5e', since: Date.parse('2026-09-27T20:05:00Z'),
      },
      lastProgress: { text: 'bg-spare verificado', percent: 60, authorName: 'Willy', at: Date.parse('2026-09-27T20:30:00Z') },
      progressCount: 1,
      closedByName: 'Willy',
      closedAt: Date.parse('2026-09-27T21:00:00Z'),
      resolution: 'El watchdog cierra el daemon en 3 minutos',
      updatedAt: Date.parse('2026-09-27T21:00:00Z'),
    });
  });

  it('an open task has no holder, progress or closing', () => {
    const frame = vectorFrame('the answer to adding tasks');
    if (frame.case !== 'result' || frame.value.response.case !== 'addTasks') throw new Error('not an addTasks result');
    const task = toTask(frame.value.response.value.tasks[0]!);
    expect(task).toMatchObject({ number: 1, status: 'open', refs: ['plugin/src/daemon.ts'], progressCount: 0 });
    expect(task.holder).toBeUndefined();
    expect(task.lastProgress).toBeUndefined();
    expect(task.closedAt).toBeUndefined();
    expect(toTaskList(frame.value.response.value.list!)).toMatchObject({ key: 'rc5', open: 1, inProgress: 0 });
  });

  it('the requests the daemon builds are the canonical frames', () => {
    const checkout = frames.cases.find((c) => c.name === 'check out a task')!.json;
    expect(JSON.parse(encodeFrame(clientFrame({
      case: 'updateTask', value: { list: 'rc5', number: 1, change: { case: 'checkout', value: {} } },
    }, 'r12')))).toEqual(checkout);

    const progress = frames.cases.find((c) => c.name === 'report progress on a task in a named topic')!.json;
    expect(JSON.parse(encodeFrame(clientFrame({
      case: 'updateTask',
      value: { topic: 'collab-global', list: 'rc5', number: 1, change: { case: 'progress', value: { text: 'bg-spare verificado', percent: 60 } } },
    }, 'r13')))).toEqual(progress);
  });
});
