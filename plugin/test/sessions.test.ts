import { describe, expect, it } from 'vitest';
import type { Member } from '../src/lib/model.js';
import { resolveSessionTarget } from '../src/lib/sessions.js';

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
