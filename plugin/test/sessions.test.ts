import { describe, expect, it } from 'vitest';
import type { Member, Message } from '../src/lib/model.js';
import { reachedSessions, resolveRecipient, resolveSessionTarget, type RecipientArgs } from '../src/lib/sessions.js';

const WILLY_A = '3f2a91c0-5b1e-4c0a-9d7e-2f6a1b3c4d5e';
const WILLY_B = 'a81b77d2-0c4f-4e7a-8b1d-6e9f0a2b3c4d';

function member(handle: string, overrides: Partial<Member> = {}): Member {
  return {
    memberId: handle.toUpperCase(), displayName: handle, handle, status: 'online', connections: 0, topics: [], lastSeenAt: Date.now(),
    sessions: [],
    ...overrides,
  };
}

const willy = member('willy', {
  connections: 2,
  topics: ['beta-1.0'],
  sessions: [
    { clientSessionId: WILLY_A, topic: 'beta-1.0', connectedAt: 1 },
    { clientSessionId: WILLY_B, topic: 'beta-1.0', connectedAt: 2 },
  ],
});
const members = [member('carlos'), willy];

describe('addressing one session', () => {
  it('finds the member a live session belongs to, so `user` is optional', () => {
    expect(resolveSessionTarget(members, { session: WILLY_B })).toEqual({ handle: 'willy', clientSessionId: WILLY_B });
  });

  it('accepts the handle as the server does, with @ and in any case', () => {
    expect(resolveSessionTarget(members, { user: '@Willy', session: WILLY_A })).toEqual({ handle: 'willy', clientSessionId: WILLY_A });
  });

  it('keeps a topic that matches the session, and refuses one that would reach nobody', () => {
    expect(resolveSessionTarget(members, { session: WILLY_A, topic: 'Beta-1.0' }))
      .toEqual({ handle: 'willy', clientSessionId: WILLY_A, topic: 'beta-1.0' });
    expect(() => resolveSessionTarget(members, { session: WILLY_A, topic: 'other' })).toThrow(/is in topic "beta-1.0"/);
  });

  it('refuses a session of another member than the one named', () => {
    expect(() => resolveSessionTarget(members, { user: 'carlos', session: WILLY_A })).toThrow(/not connected for carlos/);
  });

  it('refuses a session that is not connected, listing the member\'s live ones', () => {
    expect(() => resolveSessionTarget(members, { user: 'willy', session: 'gone-1' }))
      .toThrow(new RegExp(`willy's live sessions: ${WILLY_A} \\(beta-1.0\\), ${WILLY_B}`));
    expect(() => resolveSessionTarget(members, { session: 'gone-1' })).toThrow(/is not connected\. Address it with `user`/);
  });

  it('refuses a session of a member shown offline', () => {
    const offline = [member('carlos'), { ...willy, status: 'offline' as const }];
    expect(() => resolveSessionTarget(offline, { session: WILLY_A })).toThrow(/not connected/);
  });

  it('refuses an id that is not a session id, and an unknown handle', () => {
    expect(() => resolveSessionTarget(members, { session: 'ses/1' })).toThrow(/exactly as collab_status/);
    expect(() => resolveSessionTarget(members, { user: 'nobody', session: WILLY_A })).toThrow(/no member has the handle "nobody"/);
  });

  it('refuses when the server lists no sessions, rather than reach every session of the member', () => {
    const older = members.map(({ sessions, ...rest }) => rest);
    expect(() => resolveSessionTarget(older, { user: 'willy', session: WILLY_A })).toThrow(/does not list sessions yet/);
  });

  it('asks which member when two share a session id', () => {
    const twins = [willy, member('ana', { sessions: [{ clientSessionId: WILLY_A, topic: 't1', connectedAt: 3 }] })];
    expect(() => resolveSessionTarget(twins, { session: WILLY_A })).toThrow(/more than one member.*willy, ana/);
    expect(resolveSessionTarget(twins, { user: 'ana', session: WILLY_A })).toEqual({ handle: 'ana', clientSessionId: WILLY_A });
  });
});

describe('who a message goes to', () => {
  // Willy writes from s-w1 in collab-global and has s-w2 open in masterlive-global.
  const people = [
    member('willy', { memberId: 'WILLY', sessions: [
      { clientSessionId: 's-w1', topic: 'collab-global', connectedAt: 1 },
      { clientSessionId: 's-w2', topic: 'masterlive-global', connectedAt: 2 },
    ] }),
    member('carlos', { memberId: 'CARLOS', sessions: [
      { clientSessionId: 's-c1', topic: 'collab-global', connectedAt: 1 },
      { clientSessionId: 's-c2', topic: 'masterlive-global', connectedAt: 2 },
    ] }),
    member('ana', { memberId: 'ANA', sessions: [{ clientSessionId: 's-a1', topic: 'masterlive-global', connectedAt: 1 }] }),
    member('bob', { memberId: 'BOB', status: 'offline' }),
  ];
  const inbox: Message[] = [
    { seq: 58, channel: 'team', fromMemberId: 'CARLOS', fromName: 'Carlos', fromHandle: 'carlos', fromTopic: 'collab-global',
      fromClientSessionId: 's-c1', to: { memberId: 'WILLY' }, type: 'question', text: '?', urgency: 'normal', sentAt: 0 },
    { seq: 60, channel: 'team', fromMemberId: 'CARLOS', fromName: 'Carlos', fromHandle: 'carlos', fromTopic: 'masterlive-global',
      fromClientSessionId: 's-gone', to: { memberId: 'WILLY' }, type: 'question', text: '?', urgency: 'normal', sentAt: 0 },
  ];
  const context = {
    members: people, self: 'WILLY', ownSession: 's-w1', topic: 'collab-global',
    findMessage: (seq: number) => inbox.find((m) => m.seq === seq),
  };
  const to = (args: RecipientArgs, members = people) => resolveRecipient(args, { ...context, members });

  it('sends `user` alone to that member in this topic when they have a session in it', () => {
    expect(to({ user: 'carlos' })).toEqual({ to: { handle: 'carlos', topic: 'collab-global' } });
  });

  it('sends `user` alone to every session of theirs when they have none in this topic, and says so', () => {
    const sent = to({ user: 'ana' });
    expect(sent.to).toEqual({ handle: 'ana' });
    expect(sent.note).toBe('ana has no session in collab-global, so it went to every session of theirs.');
  });

  it('does not count this session as the member being here, when writing to oneself', () => {
    expect(to({ user: 'willy' }).to).toEqual({ handle: 'willy' });
  });

  it('keeps every session for a member who is offline, or when the server lists no sessions', () => {
    expect(to({ user: 'bob' })).toEqual({ to: { handle: 'bob' } });
    const older = people.map((m) => ({ ...m, sessions: undefined }));
    expect(to({ user: 'carlos' }, older)).toEqual({ to: { handle: 'carlos' } });
  });

  it('reaches every session of the member with anyTopic, which needs a user and no topic', () => {
    expect(to({ user: 'carlos', anyTopic: true })).toEqual({ to: { handle: 'carlos' } });
    expect(() => to({ anyTopic: true })).toThrow(/goes with `user`/);
    expect(() => to({ user: 'carlos', topic: 'x', anyTopic: true })).toThrow(/leave `topic` and `session` out/);
  });

  it('takes a topic, alone or with a user, exactly as given', () => {
    expect(to({ topic: 'collab-global' })).toEqual({ to: { topic: 'collab-global' } });
    expect(to({ user: 'carlos', topic: 'masterlive-global' })).toEqual({ to: { handle: 'carlos', topic: 'masterlive-global' } });
    expect(() => to({})).toThrow(/say who this is for: `replyTo`/);
  });

  it('answers with replyTo the session that wrote, or its member in its topic once that session is gone', () => {
    expect(to({ replyTo: 58 })).toEqual({ to: { handle: 'carlos', clientSessionId: 's-c1' } });
    const late = to({ replyTo: 60 });
    expect(late.to).toEqual({ handle: 'carlos', topic: 'masterlive-global' });
    expect(late.note).toMatch(/The session that wrote #60 is not connected any more, so it went to carlos in masterlive-global/);
  });

  it('refuses a replyTo it cannot follow, or one mixed with other recipient fields', () => {
    expect(() => to({ replyTo: 99 })).toThrow(/#99 is not in this session's inbox/);
    expect(() => to({ replyTo: Number.NaN })).toThrow(/the number of a message you got/);
    expect(() => to({ replyTo: 58, user: 'carlos' })).toThrow(/already says who it is for/);
  });

  it('names the live sessions a recipient covers, leaving out this one and, for a topic, the sender\'s own', () => {
    const ids = (recipient: Parameters<typeof reachedSessions>[0]) =>
      reachedSessions(recipient, people, { self: 'WILLY', ownSession: 's-w1' }).map((r) => r.session.clientSessionId);
    expect(ids({ handle: 'carlos', topic: 'collab-global' })).toEqual(['s-c1']);
    expect(ids({ handle: 'Carlos' })).toEqual(['s-c1', 's-c2']);
    expect(ids({ topic: 'masterlive-global' })).toEqual(['s-c2', 's-a1']);
    expect(ids({ handle: 'willy' })).toEqual(['s-w2']);
    expect(ids({ handle: 'carlos', clientSessionId: 's-c2' })).toEqual(['s-c2']);
  });
});
