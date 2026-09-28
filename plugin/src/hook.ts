/**
 * Single entry point for every hook event.
 *
 * Hooks are short-lived processes that run on the critical path of a turn, so
 * nothing here touches the network: the daemon has already written the channel
 * state to disk, and this only reads it.
 */
import { isChannelPrompt } from './lib/channel.js';
import { gitBranch, readConfig, resolveCredentials, setEnv, type PluginConfig } from './lib/config.js';
import { callDaemon, daemonsToRetire, DaemonUnavailable, ensureDaemon, stopDaemon } from './lib/daemon-client.js';
import {
  claimConflictReason, liveSessions, planBacklog, renderBacklog, renderClaim, renderInProgressBrief, renderMemberLines,
  renderMessage, renderSession, renderTaskListsLine, UNTRUSTED_NOTE,
} from './lib/render.js';
import {
  flattenForContext, interruptionBatch, listDaemons, pathMatchesClaim, readChannelStatus, readCursor, readLocalState,
  recentMessages, unreadMessages, writeChannelStatus, writeCursor, writeTurn, type LocalState,
} from './lib/state.js';

/** Two Stop hooks can fire back to back; never interrupt twice in a row. */
const BLOCK_COOLDOWN_MS = 4_000;

interface HookInput {
  session_id?: string;
  hook_event_name?: string;
  /** SessionStart: `startup`, `resume`, `clear`, `compact` or `fork`. */
  source?: string;
  /** Set when the hook fires inside a subagent. */
  agent_id?: string;
  cwd?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  [key: string]: unknown;
}

function emit(eventName: string, payload: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: eventName, ...payload } }));
}

async function readStdin(): Promise<HookInput> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as HookInput;
  } catch {
    return {};
  }
}

/* ── Rendering ──────────────────────────────────────────────────────────── */

/**
 * The channel at a glance.
 *
 * Two callers with opposite needs, which is why the mode is explicit:
 * `unread` (session start) shows what has not been delivered yet and the caller
 * then marks it read, so the Stop hook does not interrupt with the same
 * messages again. `recent` (after a compaction) re-shows the last few
 * regardless of the cursor, because compaction wiped context that was already
 * read — filtering by unread there would show nothing at all.
 */
function renderChannelSummary(
  clientSessionId: string,
  mode: 'unread' | 'recent',
): { text: string; highestSeq: number } | undefined {
  const state = readLocalState(clientSessionId);
  if (!state.channel) return undefined;

  const topic = flattenForContext(state.topic);
  const lines = [
    `[collab-channel] channel "${state.channel}", topic "${topic}" — `
      + `${state.connected ? 'connected' : `OFFLINE (working from cache)${state.lastError ? `: ${flattenForContext(state.lastError)}` : ''}`}`,
  ];

  const me = state.members.find((m) => m.memberId === state.self);
  const others = me ? liveSessions(me).filter((s) => s.clientSessionId !== clientSessionId) : [];
  lines.push(`This session: ${flattenForContext(clientSessionId)}${others.length > 0
    ? `. Your other sessions: ${others.map((s) => renderSession(s)).join(' · ')}` : ''}`);

  const peers = state.members.filter((m) => m.memberId !== state.self);
  lines.push(peers.length > 0
    ? ['Members:', ...peers.flatMap((m) => renderMemberLines(m, state.self, clientSessionId))].join('\n')
    : 'Members: nobody else has joined this channel yet');
  lines.push('Address every collab_send and collab_done: replyTo <seq> answers exactly the session that wrote that '
    + `message; topic "${topic}" reaches the others in this topic; user "<handle>" that member in this topic when they `
    + 'are in it, otherwise every session of theirs (anyTopic: true for all of them on purpose); user and topic, that '
    + 'member\'s sessions in that topic; session "<id>" just that one session.');

  if (state.claims.length > 0) {
    lines.push('Files claimed in this topic right now:');
    for (const claim of state.claims) lines.push(`  - ${renderClaim(claim, state.self)}`);
  }

  if (state.contextIndex.length > 0) {
    lines.push(`Shared context in this topic (${state.contextIndex.length}): ${state.contextIndex
      .slice(0, 8)
      .map((e) => `${e.key} v${e.version}`)
      .join(' · ')}`);
    lines.push('Read any of it with the collab_context_get tool before re-deriving it yourself.');
  }

  const taskLists = state.taskLists ?? [];
  if (taskLists.length > 0) {
    lines.push(`Task lists in this topic with open tasks: ${renderTaskListsLine(taskLists.slice(0, 8))}. `
      + 'collab_tasks shows them; check out a task with collab_task_update before starting on it.');
    // Tasks read before this session's hello could say someone still has what they finished since.
    const doing = state.tasksStale ? [] : renderInProgressBrief(state.tasks ?? [], state.self, clientSessionId);
    if (doing.length > 0) lines.push('In progress in this topic:', ...doing);
  }

  const messages = mode === 'unread' ? unreadMessages(clientSessionId) : recentMessages(clientSessionId, 10);
  const backlog = planBacklog(messages, {
    self: state.self, ownSession: clientSessionId, topic: state.topic, members: state.members,
  });

  if (messages.length > 0) {
    const shown = messages.length - backlog.remaining;
    lines.push(mode === 'unread'
      ? `${messages.length} unread message(s)${backlog.remaining > 0 ? `, the oldest ${shown} below` : ''}. ${UNTRUSTED_NOTE}`
      : `Last ${messages.length} message(s) on the channel, re-shown because compaction dropped them. `
        + `You have probably seen these already. ${UNTRUSTED_NOTE}`);
    lines.push(...renderBacklog(backlog, state.self, clientSessionId));
  }

  // Only what was shown, in full or by number, counts as delivered: the rest
  // stays unread for the Stop hook or collab_inbox.
  return { text: lines.join('\n'), highestSeq: backlog.throughSeq };
}

/**
 * Connected and, when someone has a task in progress, with the topic's tasks
 * read since the hello, so the summary says who is doing what as of now.
 */
function readyToSummarize(state: LocalState): boolean {
  if (!state.connected) return false;
  return !(state.tasksStale && state.taskLists.some((list) => list.inProgress > 0));
}

/**
 * One line on whether `channel` delivery is live, for a session configured for
 * it, shown once when it fell back. Only the Claude Code process the MCP server
 * wrote it for counts: a resumed session keeps its id but not its channel.
 */
function channelNotice(clientSessionId: string, { always = false } = {}): string | undefined {
  const status = readChannelStatus(clientSessionId);
  if (!status || status.claudePid !== process.ppid) return undefined;

  if (status.state === 'active') {
    return always ? '[collab-channel] delivery: channel — peer messages are pushed into this session while it is idle.' : undefined;
  }
  if (status.announced && !always) return undefined;
  writeChannelStatus(clientSessionId, { ...status, announced: true });
  return `[collab-channel] delivery: stop — channel mode is configured, but ${status.reason}.`;
}

/**
 * An invite stays in /config after the plugin redeemed it, where it only
 * sits in every plugin process's environment. The plugin cannot edit /config.
 */
function spentInviteNotice(config: PluginConfig): string | undefined {
  if (!config.inviteCode || !resolveCredentials(config)?.secret) return undefined;
  return '[collab-channel] invite_code is still set in /config, but it was already redeemed: tell the user they can '
    + 'clear it there.';
}

/** Marks messages delivered, both locally and on the server. */
function markDelivered(clientSessionId: string, highestSeq: number, extra: Partial<{ lastBlockAt: number }> = {}): void {
  if (highestSeq <= 0) return;
  writeCursor(clientSessionId, { delivered: highestSeq, ...extra });
  void callDaemon(clientSessionId, '/ack', { method: 'POST', body: { cursor: highestSeq }, timeoutMs: 1_500 })
    .catch(() => undefined);
}

/* ── Events ─────────────────────────────────────────────────────────────── */

/**
 * Daemons this session start makes redundant: those of sessions this Claude
 * Code process ran before, and this session's own when an earlier process
 * started it (see `daemonsToRetire`). This session's own has to be gone before
 * `ensureDaemon` looks, or it would simply be reused.
 */
async function retireStaleDaemons(clientSessionId: string): Promise<void> {
  const stale = daemonsToRetire(listDaemons(), { clientSessionId, claudePid: process.ppid });
  await Promise.all(stale.map((info) => stopDaemon(info, { wait: info.clientSessionId === clientSessionId })
    .catch(() => undefined)));
}

async function onSessionStart(
  input: HookInput,
  config: PluginConfig,
  clientSessionId: string,
  tracksTurns: boolean,
): Promise<void> {
  if (input.source === 'compact') return onCompact(config, clientSessionId, tracksTurns);

  const cwd = input.cwd ?? process.cwd();
  setEnv('COLLAB_REPO', cwd.split(/[\\/]/).pop());
  setEnv('COLLAB_BRANCH', gitBranch(cwd));
  // The daemon resolves the session's topic from here.
  process.env.COLLAB_CWD = cwd;

  // A subagent shares the session and the process; it retires nothing.
  if (!input.agent_id) await retireStaleDaemons(clientSessionId);

  try {
    await ensureDaemon(clientSessionId);
    // Wait for the socket rather than guessing a delay: a cold Lambda takes a
    // couple of seconds, a warm one is immediate.
    const deadline = Date.now() + 4_000;
    while (Date.now() < deadline && !readyToSummarize(readLocalState(clientSessionId))) {
      await new Promise((r) => setTimeout(r, 150));
    }
  } catch (err) {
    emit('SessionStart', {
      additionalContext: `[collab-channel] the channel daemon could not start: ${(err as Error).message}. `
        + 'Collaboration tools will run in degraded mode.',
    });
    return;
  }

  if (config.deliveryMode === 'manual') {
    emit('SessionStart', {
      additionalContext: '[collab-channel] connected. Delivery mode is "manual": nothing is injected '
        + 'automatically — call collab_status when you want the channel state.',
    });
    return;
  }

  const summary = renderChannelSummary(clientSessionId, 'unread');
  if (!summary) return;

  const notices = [
    tracksTurns ? channelNotice(clientSessionId, { always: true }) : undefined,
    spentInviteNotice(config),
  ].filter((line): line is string => Boolean(line));
  emit('SessionStart', { additionalContext: [summary.text, ...notices].join('\n') });
  // Injecting them IS delivering them. Without this the Stop hook interrupts at
  // the end of the first turn with messages already shown at startup, which
  // costs a turn and teaches you to ignore the interruption.
  markDelivered(clientSessionId, summary.highestSeq);
}

/**
 * The closest thing to a real push inside a turn-based session: when the model
 * is about to go idle, unread peer messages are fed back so it reacts to them
 * before stopping.
 */
function onStop(config: PluginConfig, clientSessionId: string, tracksTurns: boolean): number {
  if (config.deliveryMode === 'manual' || config.deliveryMode === 'prompt') return 0;

  const state = readLocalState(clientSessionId);
  const cursor = readCursor(clientSessionId);

  // `stop_hook_active` is no longer part of the documented input, so the guard
  // is ours: advance the cursor before blocking, and rate-limit on top of that.
  if (Date.now() - cursor.lastBlockAt < BLOCK_COOLDOWN_MS) return 0;

  // Filtering by urgency here and then advancing the cursor past the newest
  // match used to drop quieter messages that arrived before it for good.
  const unread = interruptionBatch(clientSessionId, config.stopMinUrgency);
  if (unread.length === 0) return 0;

  markDelivered(clientSessionId, Math.max(...unread.map((m) => m.seq)), { lastBlockAt: Date.now() });
  const notice = tracksTurns ? channelNotice(clientSessionId) : undefined;

  process.stderr.write(
    [
      ...(notice ? [notice] : []),
      `[collab-channel] ${unread.length} new message(s) arrived on the channel while you were working.`,
      UNTRUSTED_NOTE,
      '',
      ...unread.map((message) => renderMessage(message, state.self, clientSessionId)),
      '',
      'Take them into account now: answer questions, pick up work that was just unblocked, '
      + 'or acknowledge with the collab_send tool, with replyTo set to the message\'s number so the answer goes back '
      + 'to exactly the session that wrote it. If nothing is needed, say so briefly and stop.',
    ].join('\n'),
  );
  // Exit code 2 is what blocks the stop and feeds stderr back to the model.
  return 2;
}

function onUserPromptSubmit(config: PluginConfig, clientSessionId: string): void {
  if (config.deliveryMode !== 'prompt' && config.deliveryMode !== 'all') return;

  const state = readLocalState(clientSessionId);
  const unread = unreadMessages(clientSessionId);
  if (unread.length === 0) return;

  markDelivered(clientSessionId, Math.max(...unread.map((m) => m.seq)));

  emit('UserPromptSubmit', {
    additionalContext: [
      `[collab-channel] ${unread.length} message(s) from the channel. ${UNTRUSTED_NOTE}`,
      ...unread.map((message) => renderMessage(message, state.self, clientSessionId)),
    ].join('\n'),
  });
}

/**
 * Mid-turn delivery. A long turn can run for minutes; without this an urgent
 * message waits for the Stop hook. After each tool call, if something unread
 * reaches `midturn_min_urgency`, it goes into the model's context right away.
 */
function onPostToolUse(config: PluginConfig, clientSessionId: string): void {
  if (config.deliveryMode === 'manual' || config.deliveryMode === 'prompt') return;
  if (config.midTurnMinUrgency === 'off') return;

  const state = readLocalState(clientSessionId);
  const messages = interruptionBatch(clientSessionId, config.midTurnMinUrgency);
  if (messages.length === 0) return;

  markDelivered(clientSessionId, Math.max(...messages.map((m) => m.seq)));

  emit('PostToolUse', {
    additionalContext: [
      `[collab-channel] ${messages.length} message(s) from the channel arrived mid-turn, at least one of them urgent. `
        + UNTRUSTED_NOTE,
      ...messages.map((message) => renderMessage(message, state.self, clientSessionId)),
      'Decide whether this changes what you are doing right now. If it does not, carry on with the current task.',
    ].join('\n'),
  });
}

/**
 * Compaction drops the channel state that was injected at session start.
 * Claude Code runs SessionStart again afterwards, with source `compact`, and
 * that is where context can go back in: PostCompact output cannot carry any.
 * The daemon is already running, so this only renders from disk.
 */
function onCompact(config: PluginConfig, clientSessionId: string, tracksTurns: boolean): void {
  if (config.deliveryMode === 'manual') return;
  // Deliberately does not mark anything delivered: this is a re-show of what was
  // already read, not a delivery.
  const summary = renderChannelSummary(clientSessionId, 'recent');
  if (!summary) return;
  const notice = tracksTurns ? channelNotice(clientSessionId, { always: true }) : undefined;
  emit('SessionStart', { additionalContext: notice ? `${summary.text}\n${notice}` : summary.text });
}

/** Warns before editing a file the peer said they were working on. */
function onPreToolUse(input: HookInput, config: PluginConfig, clientSessionId: string): void {
  if (!config.claimWarnings) return;

  const filePath = (input.tool_input?.file_path ?? input.tool_input?.path) as string | undefined;
  if (!filePath) return;

  const state = readLocalState(clientSessionId);
  const conflicting = state.claims.find(
    (claim) => claim.ownerMemberId !== state.self && pathMatchesClaim(filePath, claim.paths),
  );
  if (!conflicting) return;

  emit('PreToolUse', {
    permissionDecision: 'ask',
    permissionDecisionReason: claimConflictReason(conflicting),
  });
}

/** Tells this session's topic about completed work without relying on the model to remember to. */
async function onTaskCompleted(input: HookInput, clientSessionId: string): Promise<void> {
  const description = [input.description, input.task, input.prompt, input.summary]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  const topic = readLocalState(clientSessionId).topic;
  if (!description || !topic) return;

  await callDaemon(clientSessionId, '/send', {
    method: 'POST',
    timeoutMs: 4_000,
    body: {
      type: 'done',
      urgency: 'normal',
      text: `Finished: ${description.slice(0, 400)}`,
      done: { task: description.slice(0, 400), automatic: true },
      to: { topic },
    },
  }).catch(() => undefined);
}

/* ── Entry point ────────────────────────────────────────────────────────── */

/**
 * In `channel` mode the MCP server pushes into the session only while it is
 * idle, and confirms each push by the turn it starts. Hooks are the only thing
 * that sees turns, so they write down what they see.
 */
function recordTurn(event: string, input: HookInput, clientSessionId: string, exitCode: number): void {
  const now = Date.now();
  switch (event) {
    case 'SessionStart':
      // A compaction can come in the middle of a turn: it says nothing about whether one is running.
      if (input.source !== 'compact') writeTurn(clientSessionId, { busy: false, sessionStartAt: now });
      break;
    case 'UserPromptSubmit':
      writeTurn(clientSessionId, isChannelPrompt(input.prompt as string | undefined)
        ? { busy: true, activityAt: now }
        : { busy: true, promptAt: now });
      break;
    case 'PostToolUse': writeTurn(clientSessionId, { busy: true, activityAt: now }); break;
    // A Stop that blocks keeps the turn going.
    case 'Stop': writeTurn(clientSessionId, { busy: exitCode === 2, activityAt: now }); break;
    default: break;
  }
}

async function main(): Promise<number> {
  const input = await readStdin();
  const event = process.argv[2] ?? input.hook_event_name ?? '';
  const clientSessionId = input.session_id ?? 'default';
  const configured = readConfig();
  // A hook is a direct child of the Claude Code process; a daemon started from
  // here records it, and that is what pairs the session's MCP server to it.
  process.env.COLLAB_CLAUDE_PID = String(process.ppid);

  // Not configured yet: stay completely out of the way.
  if (!configured.apiEndpoint || (!resolveCredentials(configured) && !configured.inviteCode)) return 0;

  // From the hooks' side `channel` delivers exactly like `stop`. The push into
  // an idle session is the MCP server's, so without --channels it simply never
  // happens and this is plain `stop`.
  const tracksTurns = configured.deliveryMode === 'channel';
  const config: PluginConfig = tracksTurns ? { ...configured, deliveryMode: 'stop' } : configured;

  const code = await dispatch(event, input, config, clientSessionId, tracksTurns);
  // After a blocking Stop the messages are already marked delivered: letting a
  // failed write turn exit code 2 into 0 would drop them unseen.
  if (tracksTurns) {
    try { recordTurn(event, input, clientSessionId, code); } catch { /* the push waits for the next hook */ }
  }
  return code;
}

async function dispatch(
  event: string,
  input: HookInput,
  config: PluginConfig,
  clientSessionId: string,
  tracksTurns: boolean,
): Promise<number> {
  switch (event) {
    case 'SessionStart': await onSessionStart(input, config, clientSessionId, tracksTurns); return 0;
    case 'Stop': return onStop(config, clientSessionId, tracksTurns);
    case 'UserPromptSubmit': onUserPromptSubmit(config, clientSessionId); return 0;
    case 'PostToolUse': onPostToolUse(config, clientSessionId); return 0;
    case 'PreToolUse': onPreToolUse(input, config, clientSessionId); return 0;
    case 'TaskCompleted': await onTaskCompleted(input, clientSessionId); return 0;
    case 'SessionEnd': await stopDaemon(clientSessionId).catch(() => undefined); return 0;
    default: return 0;
  }
}

main()
  // Set the code rather than calling process.exit, so the stderr the Stop hook
  // just wrote is actually flushed before the process ends.
  .then((code) => { process.exitCode = code; })
  .catch((err: unknown) => {
    // A broken hook must never break the session. Report and get out of the way.
    if (!(err instanceof DaemonUnavailable)) {
      process.stderr.write(`[collab-channel] hook error: ${(err as Error).message}\n`);
    }
    process.exitCode = 0;
  });
