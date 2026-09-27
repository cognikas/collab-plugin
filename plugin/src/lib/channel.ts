import { UNTRUSTED_NOTE } from './render.js';
import type { TurnState } from './state.js';

/**
 * `channel` delivery: the MCP server pushes peer messages into the session as
 * Claude Code channel events (research preview) while the session is idle.
 *
 * Claude Code gives a channel server no way to learn whether it was registered:
 * events for a session not started with the channel flag, or whose organization
 * blocks channels, are dropped without an error. Everything here exists to
 * never mark a message delivered on the strength of a push that went nowhere,
 * and, once a push has got through, never to hand one back to the hooks just
 * because its turn was slow to show: that only delivers it twice.
 */

export const PLUGIN_NAME = 'collab-channel';

/** A turn with no hook activity for this long is treated as over, once the
 *  channel is known to deliver: Stop does not fire when the user interrupts,
 *  and a stuck `busy` would block pushes forever. */
export const BUSY_STALE_MS = 10 * 60 * 1000;

/**
 * How long a push has to show up as a turn before it counts as dropped.
 * UserPromptSubmit does not fire for a turn a channel event starts, so the
 * first sign of that turn is its first tool call ending, or its Stop: a turn
 * that opens with a build or a subagent takes minutes to leave one.
 */
export const CONFIRM_WINDOW_MS = 10 * 60 * 1000;

export type ChannelFlag = 'development' | 'channels';

/**
 * Which flag, if any, opted this plugin in as a channel in a Claude Code
 * command line. Custom plugins are not on the research-preview allowlist, so
 * only the development flag registers them unless an organization allowlists
 * the plugin; `--channels` is still reported, and a push that goes nowhere is
 * caught later by `pushOutcome`.
 */
export function channelFlag(commandLine: string, plugin = PLUGIN_NAME): ChannelFlag | undefined {
  const tokens = (commandLine.match(/"[^"]*"|\S+/g) ?? []).map((t) => t.replace(/^"|"$/g, ''));
  const names: Record<string, ChannelFlag> = {
    '--dangerously-load-development-channels': 'development',
    '--channels': 'channels',
  };
  const ours = (entry: string) => entry.split(',').some((e) => e.trim().toLowerCase().startsWith(`plugin:${plugin}@`));

  let current: ChannelFlag | undefined;
  let found: ChannelFlag | undefined;
  for (const token of tokens) {
    if (token.startsWith('--')) {
      const eq = token.indexOf('=');
      current = names[eq >= 0 ? token.slice(0, eq) : token];
      if (current && eq >= 0 && ours(token.slice(eq + 1))) found = found === 'development' ? found : current;
      continue;
    }
    // The development flag is the one that works for a custom plugin, so it wins.
    if (current && ours(token)) found = found === 'development' ? found : current;
  }
  return found;
}

/**
 * Idle unless a turn is running. Stop does not fire when the user interrupts,
 * so a turn no hook has heard from in a while counts as over — but only with
 * `trustStale`, once the channel is known to deliver in this process. Before
 * that, a turn that is only waiting on a long tool call, or on the user's
 * answer to a question, would take the first push and make it look dropped.
 */
export function isIdle(turn: TurnState | undefined, { now = Date.now(), trustStale = true } = {}): boolean {
  if (!turn?.busy) return true;
  return trustStale && now - Math.max(turn.promptAt, turn.activityAt) > BUSY_STALE_MS;
}

export type PushOutcome = 'confirmed' | 'ambiguous' | 'pending' | 'dropped';

/**
 * Whether a push into an idle session was delivered. A delivered event starts
 * a turn, and every turn leaves hook activity behind (a tool call, a Stop), so
 * activity after the push confirms it. A prompt the user typed in the meantime
 * could have started that activity itself, so it proves nothing either way.
 * Nothing at all within the window means Claude Code dropped the event.
 */
export function pushOutcome(turn: TurnState | undefined, pushedAt: number, now = Date.now()): PushOutcome {
  if (turn && turn.promptAt >= pushedAt) return 'ambiguous';
  if (turn && turn.activityAt >= pushedAt) return 'confirmed';
  return now - pushedAt > CONFIRM_WINDOW_MS ? 'dropped' : 'pending';
}

export type PushSettlement = 'delivered' | 'requeue' | 'fallback';

/**
 * What to do with a push once its outcome is known. `registered` means an
 * earlier push from this MCP server was confirmed, so Claude Code has this
 * channel, and it does not lose an event it received: one that lands while a
 * turn is running waits in Claude Code until the turn takes it. Every later
 * push then counts as delivered, whatever the hooks saw; handing it back to
 * them would only show it twice. Before that, a push that proves nothing goes
 * back to the hooks, and one that started no turn at all means the channel is
 * not registered.
 */
export function settlePush(outcome: PushOutcome, registered: boolean): PushSettlement {
  if (outcome === 'confirmed' || registered) return 'delivered';
  return outcome === 'dropped' ? 'fallback' : 'requeue';
}

/**
 * A prompt that is really one of our channel events, rather than the user
 * typing. Whether Claude Code hands the tag or only its content to the hook is
 * not documented, so either one counts: every event's content opens with the
 * untrusted-text note.
 */
export function isChannelPrompt(prompt: string | undefined): boolean {
  if (typeof prompt !== 'string') return false;
  return prompt.includes('collab_seq=') || prompt.includes(`plugin:${PLUGIN_NAME}`) || prompt.includes(UNTRUSTED_NOTE);
}
