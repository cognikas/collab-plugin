import {
  create, DonePayloadSchema, MemberStatus, MessageType as WireMessageType, SendRequestSchema, timestampMs, Urgency as WireUrgency,
  type ChannelState as WireChannelState, type Claim as WireClaim, type ContextEntry as WireContextEntry,
  type ContextSummary as WireContextSummary, type Member as WireMember, type Message as WireMessage, type SendRequest,
  type SendResponse, type Timestamp,
} from '@collab/protocol';
import type {
  ChannelSnapshot, Claim, ContextEntry, ContextSummary, Member, Message, MessageType, OutgoingMessage, SendResult, Urgency,
} from './model.js';

/**
 * The only place collab.v1 wire types become the plugin's own (lib/model.ts),
 * and back. Unknown or unspecified enum values read as the protocol's defaults:
 * a note, normal urgency, offline.
 */

function ms(ts: Timestamp | undefined): number {
  return ts ? timestampMs(ts) : 0;
}

/** Empty strings are how protobuf says "not set". */
function opt(value: string): string | undefined {
  return value ? value : undefined;
}

export function urgencyOf(value: WireUrgency): Urgency {
  switch (value) {
    case WireUrgency.LOW: return 'low';
    case WireUrgency.HIGH: return 'high';
    default: return 'normal';
  }
}

export function toWireUrgency(value: Urgency | undefined): WireUrgency {
  switch (value) {
    case 'low': return WireUrgency.LOW;
    case 'high': return WireUrgency.HIGH;
    case 'normal': return WireUrgency.NORMAL;
    default: return WireUrgency.UNSPECIFIED;
  }
}

export function messageTypeOf(value: WireMessageType): MessageType {
  switch (value) {
    case WireMessageType.QUESTION: return 'question';
    case WireMessageType.DONE: return 'done';
    case WireMessageType.CLAIM: return 'claim';
    case WireMessageType.RELEASE: return 'release';
    case WireMessageType.CONTEXT: return 'context';
    default: return 'note';
  }
}

function toWireMessageType(value: OutgoingMessage['type']): WireMessageType {
  switch (value) {
    case 'question': return WireMessageType.QUESTION;
    case 'done': return WireMessageType.DONE;
    case 'note': return WireMessageType.NOTE;
    default: return WireMessageType.UNSPECIFIED;
  }
}

function statusOf(value: MemberStatus): Member['status'] {
  switch (value) {
    case MemberStatus.ONLINE: return 'online';
    case MemberStatus.IDLE: return 'idle';
    default: return 'offline';
  }
}

export function toMessage(message: WireMessage): Message {
  const local: Message = {
    seq: message.seq,
    channel: message.channel,
    fromMemberId: message.fromMemberId,
    fromName: message.fromName,
    fromHandle: message.fromHandle,
    fromTopic: message.fromTopic,
    ...(message.fromClientSessionId ? { fromClientSessionId: message.fromClientSessionId } : {}),
    to: {
      ...(message.to?.memberId ? { memberId: message.to.memberId } : {}),
      ...(message.to?.handle ? { handle: message.to.handle } : {}),
      ...(message.to?.topic ? { topic: message.to.topic } : {}),
      ...(message.to?.clientSessionId ? { clientSessionId: message.to.clientSessionId } : {}),
    },
    type: messageTypeOf(message.type),
    text: message.text,
    urgency: urgencyOf(message.urgency),
    ...(message.refs.length ? { refs: [...message.refs] } : {}),
    sentAt: ms(message.sentAt),
  };
  const payload = message.payload;
  switch (payload.case) {
    case 'done': local.done = { task: payload.value.task, automatic: payload.value.automatic }; break;
    case 'claim': local.claim = { claimId: payload.value.claimId, expiresAt: ms(payload.value.expiresAt) }; break;
    case 'release': local.release = { claimId: payload.value.claimId }; break;
    case 'context': local.context = { key: payload.value.key, version: payload.value.version }; break;
    default: break;
  }
  return local;
}

export function toMember(member: WireMember): Member {
  return {
    memberId: member.memberId,
    displayName: member.displayName,
    handle: member.handle,
    status: statusOf(member.status),
    repo: opt(member.repo),
    branch: opt(member.branch),
    connections: member.connections,
    topics: [...member.topics],
    lastSeenAt: ms(member.lastSeenAt),
    sessions: member.sessions.map((session) => ({
      clientSessionId: session.clientSessionId,
      topic: session.topic,
      repo: opt(session.repo),
      branch: opt(session.branch),
      connectedAt: ms(session.connectedAt),
    })),
  };
}

export function toClaim(claim: WireClaim): Claim {
  return {
    claimId: claim.claimId,
    ownerMemberId: claim.ownerMemberId,
    ownerName: claim.ownerName,
    topic: claim.topic,
    paths: [...claim.paths],
    note: opt(claim.note),
    createdAt: ms(claim.createdAt),
    expiresAt: ms(claim.expiresAt),
  };
}

export function toContextSummary(entry: WireContextSummary | WireContextEntry): ContextSummary {
  return {
    key: entry.key,
    version: entry.version,
    title: entry.title,
    summary: entry.summary,
    authorName: entry.authorName,
    createdAt: ms(entry.createdAt),
  };
}

export function toContextEntry(entry: WireContextEntry): ContextEntry {
  return { ...toContextSummary(entry), body: entry.body, authorMemberId: entry.authorMemberId };
}

export function toSnapshot(state: WireChannelState): ChannelSnapshot {
  return {
    channel: state.channel,
    self: state.selfMemberId,
    handle: state.handle,
    topic: state.topic,
    members: state.members.map(toMember),
    claims: state.claims.map(toClaim),
    contextIndex: state.contextIndex.map(toContextSummary),
    messages: state.messages.map(toMessage),
    cursor: state.cursor,
    latestSeq: state.latestSeq,
  };
}

/** What the tools and hooks send, as a SendRequest. A `done` payload only goes with type done. */
export function toSendRequest(message: OutgoingMessage): SendRequest {
  const done = message.type === 'done' && message.done?.task
    ? create(DonePayloadSchema, { task: message.done.task, automatic: message.done.automatic ?? false })
    : undefined;
  return create(SendRequestSchema, {
    type: toWireMessageType(message.type),
    text: message.text,
    to: { handle: message.to.handle ?? '', topic: message.to.topic ?? '', clientSessionId: message.to.clientSessionId ?? '' },
    urgency: toWireUrgency(message.urgency),
    refs: message.refs ?? [],
    ...(done ? { done } : {}),
  });
}

export function toSendResult(response: SendResponse): SendResult {
  return { seq: response.seq, delivered: response.delivered, deliveredOffline: response.deliveredOffline };
}
