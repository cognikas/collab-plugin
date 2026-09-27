/**
 * The plugin's own view of the channel, as the daemon writes it to disk and the
 * hooks, the MCP server and the CLI read it.
 *
 * Deliberately plain JSON (numbers in ms, lowercase words for enums) rather than
 * the collab.v1 wire types: hooks run on every turn and must stay small and fast,
 * so they never load the protobuf runtime. The daemon converts at the boundary
 * (lib/wire.ts); nothing else touches wire types.
 */

export type Urgency = 'low' | 'normal' | 'high';

export const URGENCY_RANK: Record<Urgency, number> = { low: 0, normal: 1, high: 2 };

export type MessageType = 'note' | 'question' | 'done' | 'claim' | 'release' | 'context' | 'task';

export type MemberStatus = 'online' | 'idle' | 'offline';

/** A recipient as the server resolved it. */
export interface Addressee {
  memberId?: string;
  handle?: string;
  topic?: string;
  /** The one session of `memberId` it is for. */
  clientSessionId?: string;
}

export interface Message {
  seq: number;
  channel: string;
  fromMemberId: string;
  fromName: string;
  fromHandle: string;
  /** Topic of the session that sent it, so a reply can go back to exactly there. */
  fromTopic: string;
  /** The session that sent it, so a reply can go back to exactly that session. */
  fromClientSessionId?: string;
  to: Addressee;
  type: MessageType;
  text: string;
  urgency: Urgency;
  refs?: string[];
  /** When the server stored it, in ms. */
  sentAt: number;
  done?: { task: string; automatic: boolean };
  claim?: { claimId: string; expiresAt: number };
  release?: { claimId: string };
  context?: { key: string; version: number };
  task?: TaskNotice;
}

/** What a TASK notice carries: the list after the change, and which tasks it was about. */
export interface TaskNotice {
  list: TaskList;
  numbers: number[];
  event: TaskEvent;
  previousHolderName?: string;
}

export type TaskStatus = 'open' | 'in_progress' | 'done' | 'dismissed';
export type TaskEvent = 'added' | 'checked_out' | 'progress' | 'released' | 'done' | 'dismissed';

/** A task list in a topic, with how many of its tasks are in each status. */
export interface TaskList {
  key: string;
  topic: string;
  title: string;
  createdByName: string;
  createdAt: number;
  updatedAt: number;
  open: number;
  inProgress: number;
  done: number;
  dismissed: number;
}

export interface Task {
  list: string;
  topic: string;
  number: number;
  title: string;
  refs?: string[];
  status: TaskStatus;
  createdByMemberId: string;
  createdByName: string;
  createdAt: number;
  holder?: { memberId: string; handle: string; name: string; clientSessionId?: string; since: number };
  lastProgress?: { text: string; percent?: number; authorName: string; at: number };
  progressCount: number;
  closedByName?: string;
  closedAt?: number;
  resolution?: string;
  updatedAt: number;
}

export interface Member {
  memberId: string;
  displayName: string;
  handle: string;
  status: MemberStatus;
  repo?: string;
  branch?: string;
  connections: number;
  topics: string[];
  lastSeenAt: number;
  /**
   * Live sessions with a socket, oldest first, this developer's own included.
   * Absent from a server older than protocol 1.0.0-rc.3 and from older state files.
   */
  sessions?: MemberSession[];
}

/** One live session of a member: a Claude Code session, addressable on its own. */
export interface MemberSession {
  clientSessionId: string;
  topic: string;
  repo?: string;
  branch?: string;
  connectedAt: number;
}

export interface Claim {
  claimId: string;
  ownerMemberId: string;
  ownerName: string;
  topic: string;
  paths: string[];
  note?: string;
  createdAt: number;
  expiresAt: number;
}

export interface ContextSummary {
  key: string;
  version: number;
  title: string;
  summary: string;
  authorName: string;
  createdAt: number;
}

export interface ContextEntry extends ContextSummary {
  body: string;
  authorMemberId: string;
}

/** What `hello` and GetState carry, in the plugin's shapes. */
export interface ChannelSnapshot {
  channel: string;
  self: string;
  handle: string;
  topic: string;
  members: Member[];
  claims: Claim[];
  contextIndex: ContextSummary[];
  /** The topic's lists with open tasks. Empty from a server older than protocol 1.0.0-rc.4. */
  taskLists: TaskList[];
  messages: Message[];
  cursor: number;
  latestSeq: number;
}

/** A message as the MCP tools and hooks hand it to the daemon's loopback API. */
export interface OutgoingMessage {
  type?: 'note' | 'question' | 'done';
  text: string;
  to: { handle?: string; topic?: string; clientSessionId?: string };
  urgency?: Urgency;
  refs?: string[];
  done?: { task: string; automatic?: boolean };
}

export interface SendResult {
  seq: number;
  delivered: number;
  deliveredOffline: boolean;
}
