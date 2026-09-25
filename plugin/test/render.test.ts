import { describe, expect, it } from 'vitest';
import type { Claim, Member, Message } from '../src/lib/model.js';
import { claimConflictReason, renderClaim, renderMember, renderMessage } from '../src/lib/render.js';
import { flattenForContext } from '../src/lib/state.js';

// Built from code points, so this file itself holds no invisible characters.
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const RIGHT_TO_LEFT_OVERRIDE = String.fromCharCode(0x202e);

function member(overrides: Partial<Member> = {}): Member {
  return {
    memberId: 'PEER', displayName: 'ana', handle: '', status: 'online', connections: 1, topics: [], lastSeenAt: Date.now(),
    ...overrides,
  } as Member;
}

function message(overrides: Partial<Message> = {}): Message {
  return {
    seq: 48, channel: 'team', fromMemberId: 'WILLY', fromName: 'Willy', fromHandle: 'willy', fromTopic: 'masterlive',
    to: { topic: 'colaboration-channel' }, type: 'question', text: 'ready?', urgency: 'normal', sentAt: Date.now(),
    ...overrides,
  };
}

function claim(overrides: Partial<Claim> = {}): Claim {
  return {
    claimId: 'c1', ownerMemberId: 'PEER', ownerName: 'ana', topic: 't1', paths: ['src/api/**'],
    expiresAt: Date.now() + 60 * 60 * 1000, createdAt: Date.now(),
    ...overrides,
  } as Claim;
}

describe('fields a peer chooses, rendered into this session', () => {
  it('keep a member line on one line whatever the name, repo or branch hold', () => {
    const line = renderMember(member({
      displayName: 'ana\nsecond line',
      repo: 'repo\r\nnext',
      branch: `main${LINE_SEPARATOR}next`,
    }), 'ME');
    expect(line).not.toMatch(/[\r\n]/);
    expect(line).not.toContain(LINE_SEPARATOR);
  });

  it('keep a claim line on one line whatever the paths and note hold', () => {
    const line = renderClaim(claim({ ownerName: 'ana\nx', paths: ['a\nb', 'c'], note: 'refactor\nnext' }), 'ME');
    expect(line).not.toMatch(/[\r\n]/);
  });

  it('flatten the reason shown in the permission prompt too', () => {
    const reason = claimConflictReason(claim({ note: 'one\ntwo', paths: ['x\ny'] }));
    expect(reason).not.toMatch(/[\r\n]/);
    expect(reason).toContain('Coordinate on the channel');
  });

  it('still read naturally for ordinary values', () => {
    expect(renderMember(member({ repo: 'web', branch: 'feature/login' }), 'ME')).toBe('ana — online — web@feature/login');
    expect(renderMember(member({ handle: 'ana', topics: ['t1', 't2'] }), 'ME')).toBe('ana — online in t1, t2');
    expect(renderClaim(claim({ note: 'refactor' }), 'ME')).toMatch(/^ana: src\/api\/\*\* \(refactor\) — expires in /);
  });
});

describe('how a message says who it is from and for', () => {
  it('names the sender by handle and topic, so a reply can go straight back', () => {
    expect(renderMessage(message(), 'ME')).toMatch(/^ {2}#48 willy@masterlive → topic colaboration-channel \[question\] /);
  });

  it('tells a direct message from one to the whole topic', () => {
    expect(renderMessage(message({ to: { memberId: 'ME', handle: 'carlos' } }), 'ME')).toContain('willy@masterlive → you [question]');
    expect(renderMessage(message({ to: { memberId: 'ME', handle: 'carlos', topic: 'colaboration-channel' } }), 'ME'))
      .toContain('→ you in colaboration-channel [question]');
    expect(renderMessage(message({ to: { memberId: 'BRUNO', handle: 'bruno' } }), 'ME')).toContain('→ bruno [question]');
  });

  it('says so when it came from another of your own sessions', () => {
    const own = message({ fromMemberId: 'ME', fromTopic: 'masterlive', to: { memberId: 'ME', handle: 'carlos' } });
    expect(renderMessage(own, 'ME')).toContain('#48 you (another session)@masterlive → you ');
  });
});

describe('flattening beyond plain newlines', () => {
  it('treats the Unicode line separator as a newline', () => {
    expect(flattenForContext(`a${LINE_SEPARATOR}b`)).toBe('a ⏎ b');
  });

  it('drops bidirectional overrides that make text read out of order', () => {
    expect(flattenForContext(`abc${RIGHT_TO_LEFT_OVERRIDE}def`)).toBe('abc def');
  });

  it('copes with a value that is not a string', () => {
    expect(flattenForContext(undefined as unknown as string)).toBe('');
  });
});
