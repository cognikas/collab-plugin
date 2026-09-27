import { isClientSessionId, slug } from '@collab/protocol';
import type { Member, MemberSession, Message } from './model.js';
import { liveSessions } from './render.js';
import { flattenForContext } from './state.js';

/** The recipient fields collab_send and collab_done take (RECIPIENT_PROPERTIES in the MCP server). */
export interface RecipientArgs {
  user?: string;
  topic?: string;
  session?: string;
  anyTopic?: boolean;
  replyTo?: number;
}

export interface RecipientContext {
  members: Member[];
  /** This member's id. */
  self: string;
  /** This session: the server never sends it what it sent itself. */
  ownSession: string;
  /** This session's topic. */
  topic: string;
  /** A message of this session's inbox, by seq. */
  findMessage: (seq: number) => Message | undefined;
}

export interface Recipient {
  to: { handle?: string; topic?: string; clientSessionId?: string };
  /** Why it went somewhere other than the arguments alone say, for the sender to read. */
  note?: string;
}

/**
 * Who a message goes to.
 *
 * - `replyTo`: back to the session that wrote that message; once it is gone, to
 *   its member in the topic it was written from, where the conversation is.
 * - `session`: that one session (`resolveSessionTarget`).
 * - `user` alone: that member in this session's topic when they have a live
 *   session there, so one project's messages stay out of the member's sessions
 *   on other projects. Otherwise every session of theirs, and the note says so;
 *   `anyTopic` asks for every session on purpose.
 * - `user` with `topic`, or `topic` alone: exactly that.
 */
export function resolveRecipient(args: RecipientArgs, context: RecipientContext): Recipient {
  const user = args.user?.trim() || undefined;
  const topic = args.topic?.trim() || undefined;
  const session = args.session?.trim() || undefined;

  if (args.replyTo !== undefined) {
    if (user || topic || session || args.anyTopic) {
      throw new Error('`replyTo` already says who it is for: leave `user`, `topic`, `session` and `anyTopic` out');
    }
    return replyRecipient(Number(args.replyTo), context);
  }
  if (args.anyTopic) {
    if (!user) throw new Error('`anyTopic` goes with `user`: it reaches every session of that member');
    if (topic || session) throw new Error('`anyTopic` means every topic: leave `topic` and `session` out');
    return { to: { handle: user } };
  }
  if (session) return { to: resolveSessionTarget(context.members, { user, topic, session }) };
  if (!user && !topic) {
    throw new Error('say who this is for: `replyTo` answers the session that wrote a message you got, `topic` reaches '
      + `everyone in a topic${context.topic ? ` (yours is "${context.topic}")` : ''}, \`user\` a member (in your topic `
      + 'when they are in it), both that member in that topic, and `session` just one session of a member');
  }
  if (topic) return { to: { handle: user, topic } };

  const member = context.members.find((m) => m.handle === slug(user!));
  // No sessions listed (a server older than protocol 1.0.0-rc.3) or not online:
  // nothing to choose from, so every session of theirs, as it always was.
  if (!member?.sessions || !context.topic || liveSessions(member).length === 0) return { to: { handle: user } };
  const here = liveSessions(member)
    .some((s) => s.topic === context.topic && s.clientSessionId !== context.ownSession);
  if (here) return { to: { handle: user, topic: context.topic } };
  return {
    to: { handle: user },
    note: `${member.handle} has no session in ${flattenForContext(context.topic)}, so it went to every session of theirs.`,
  };
}

function replyRecipient(seq: number, context: RecipientContext): Recipient {
  if (!Number.isInteger(seq) || seq <= 0) {
    throw new Error('`replyTo` is the number of a message you got: 58 for #58');
  }
  const message = context.findMessage(seq);
  if (!message) {
    throw new Error(`#${seq} is not in this session's inbox; address the answer with \`user\` and \`topic\` instead`);
  }
  const member = context.members.find((m) => m.memberId === message.fromMemberId);
  const handle = member?.handle ?? message.fromHandle;
  const from = message.fromClientSessionId;
  if (from && member && liveSessions(member).some((s) => s.clientSessionId === from)) {
    return { to: { handle, clientSessionId: from } };
  }
  if (!message.fromTopic) return { to: { handle } };
  return {
    to: { handle, topic: message.fromTopic },
    note: from
      ? `The session that wrote #${seq} is not connected any more, so it went to ${flattenForContext(handle)} `
        + `in ${flattenForContext(message.fromTopic)}.`
      : undefined,
  };
}

/**
 * The live sessions a recipient covers, as far as presence knows, for the
 * sender's confirmation. The server's delivery count is what confirms it.
 */
export function reachedSessions(
  to: Recipient['to'],
  members: Member[],
  context: { self: string; ownSession: string },
): Array<{ handle: string; session: MemberSession }> {
  const handle = to.handle ? slug(to.handle) : undefined;
  const topic = to.topic ? slug(to.topic) : undefined;
  const reached: Array<{ handle: string; session: MemberSession }> = [];
  for (const member of members) {
    if (handle ? member.handle !== handle : member.memberId === context.self) continue;
    for (const session of liveSessions(member)) {
      if (session.clientSessionId === context.ownSession) continue;
      if (to.clientSessionId && session.clientSessionId !== to.clientSessionId) continue;
      if (topic && session.topic !== topic) continue;
      reached.push({ handle: member.handle, session });
    }
  }
  return reached;
}

/**
 * Turns the `session` a tool was given into a recipient the server accepts:
 * the session id plus the handle of the member it belongs to, since a session
 * id is only unique within its member.
 *
 * The session must be live in the presence this session last saw. That is what
 * catches a mistyped id before it silently waits in history forever, and a
 * server older than protocol 1.0.0-rc.3: it lists no sessions and would drop the
 * id, delivering to every session of the member instead of one.
 */
export function resolveSessionTarget(
  members: Member[],
  args: { user?: string; topic?: string; session: string },
): { handle: string; clientSessionId: string; topic?: string } {
  const session = args.session.trim();
  if (!isClientSessionId(session)) {
    throw new Error('`session` must be a session id exactly as collab_status or a message shows it');
  }
  if (!members.some((m) => m.sessions !== undefined)) {
    throw new Error('the channel server does not list sessions yet, so a message cannot go to just one; '
      + 'address it with `user` and `topic` instead');
  }

  const owners = members.filter((m) => m.status !== 'offline' && m.sessions?.some((s) => s.clientSessionId === session));
  // The same normalisation the server applies to a handle, so `@Willy` finds `willy`.
  const wanted = args.user?.trim() ? slug(args.user) : undefined;
  const owner = wanted ? owners.find((m) => m.handle === wanted) : owners.length === 1 ? owners[0] : undefined;
  if (owner) {
    // A session's topic never changes, so a different one would only make sure the message reaches nobody.
    const topic = args.topic?.trim() ? slug(args.topic) : undefined;
    const actual = owner.sessions!.find((s) => s.clientSessionId === session)!.topic;
    if (topic && topic !== actual) {
      throw new Error(`session ${session} of ${owner.handle} is in topic "${actual}", not "${topic}"; leave \`topic\` out`);
    }
    return { handle: owner.handle, clientSessionId: session, ...(topic ? { topic } : {}) };
  }

  if (owners.length > 1) {
    throw new Error(`more than one member has a session ${session}; say which with \`user\` (${owners.map((m) => m.handle).join(', ')})`);
  }
  const member = wanted ? members.find((m) => m.handle === wanted) : undefined;
  if (wanted && !member) throw new Error(`no member has the handle "${wanted}"`);
  const live = member?.sessions?.map((s) => `${s.clientSessionId} (${s.topic})`) ?? [];
  throw new Error(`session ${session} is not connected${member ? ` for ${member.handle}` : ''}`
    + `${live.length > 0 ? `; ${member!.handle}'s live sessions: ${live.join(', ')}` : ''}`
    + '. Address it with `user` (and `topic`) instead to reach the member wherever they are');
}
