import { isClientSessionId, slug } from '@collab/protocol';
import type { Member } from './model.js';

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
