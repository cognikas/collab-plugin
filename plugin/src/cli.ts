/**
 * Small operator CLI, used by the slash commands and for troubleshooting.
 *
 *   node dist/cli.mjs status [--session <id>]
 *   node dist/cli.mjs doctor [--session <id>]
 *   node dist/cli.mjs join            # redeem an invite by hand, outside Claude Code
 *
 * It usually runs from a session's Bash tool, which is not one of the plugin's
 * own processes: CLAUDE_PLUGIN_DATA and the /config options are not in its
 * environment. So it finds the plugin's data folder itself (see `dataDir`), it
 * works out which session it is looking at from the daemons that are running,
 * and it never guesses a setting it cannot see.
 */
import fs from 'node:fs';
import path from 'node:path';
import { join as joinChannel } from './lib/api.js';
import {
  credentialsPath, dataDir, legacyDataRoot, readConfig, resolveCredentials, resolveTopic, sessionDir, writeCredentials,
  type Credentials,
} from './lib/config.js';
import { callDaemon, resolveSessionId } from './lib/daemon-client.js';
import { liveSessions, renderMemberLines, renderSession, renderTaskListsLine } from './lib/render.js';
import { readChannelStatus, readDaemonInfo, readLocalState, unreadMessages } from './lib/state.js';

/** `--session <id>` wins; otherwise the session whose daemon matches this process, its project or the newest. */
function sessionArgument(): string {
  const at = process.argv.indexOf('--session');
  const named = at > 0 ? process.argv[at + 1] : undefined;
  return named || resolveSessionId();
}

/** Credentials a CLI of 1.0.0-rc.6 or older left outside the plugin's folder, when run from a Bash tool. */
function strayCredentials(): string | undefined {
  const stray = path.join(legacyDataRoot(), 'v1', 'credentials.json');
  return path.resolve(stray) !== path.resolve(credentialsPath()) && fs.existsSync(stray) ? stray : undefined;
}

async function cmdJoin(): Promise<number> {
  const config = readConfig();
  const existing = resolveCredentials(config);
  if (existing?.secret) {
    console.log(`Already joined channel "${existing.channel}" as ${existing.displayName}.`);
    console.log(`Member id: ${existing.memberId}`);
    return 0;
  }
  // Inside a Claude Code session the plugin redeems the invite itself when the
  // session starts, with the settings from /config, which this command cannot see.
  if (!config.optionsVisible && !(process.env.COLLAB_API_ENDPOINT && process.env.COLLAB_INVITE_CODE && config.displayNameSet)) {
    console.error('This command cannot see your /config settings, so it will not redeem the invite with guessed values.');
    console.error('Inside Claude Code, fill in api_endpoint, invite_code and display_name in /config and restart Claude Code:');
    console.error('the plugin redeems the invite itself when the session starts.');
    console.error('Outside Claude Code, set COLLAB_API_ENDPOINT, COLLAB_INVITE_CODE and COLLAB_DISPLAY_NAME and run this again.');
    return 1;
  }
  if (!config.apiEndpoint) {
    console.error('api_endpoint is not set. Fill it in /config (or COLLAB_API_ENDPOINT).');
    return 1;
  }
  if (!config.inviteCode) {
    console.error('invite_code is not set. Ask whoever runs the channel for a code, then add it in /config (or COLLAB_INVITE_CODE).');
    return 1;
  }
  if (!config.displayNameSet) {
    // The handle comes from it and never changes: never let it default to the OS username.
    console.error('display_name is not set. Fill it in /config (or COLLAB_DISPLAY_NAME): your handle comes from it and never changes.');
    return 1;
  }

  const joined = await joinChannel(config.apiEndpoint, config.inviteCode, config.displayName);
  const creds: Credentials = {
    apiEndpoint: config.apiEndpoint,
    wsEndpoint: joined.wsEndpoint,
    memberId: joined.memberId,
    secret: joined.secret,
    channel: joined.channel,
    displayName: joined.displayName,
    handle: joined.handle,
    joinedAt: Date.now(),
  };
  writeCredentials(creds);

  console.log(`Joined channel "${creds.channel}" as ${creds.displayName} (handle ${creds.handle}).`);
  console.log(`Member id: ${creds.memberId}`);
  console.log(`Credentials stored in ${credentialsPath()}`);
  console.log('\nThe invite is now spent: clear invite_code in /config. To move the secret into your OS keychain instead,');
  console.log('paste the member id and secret into member_id and member_secret in /config and delete that file.');
  return 0;
}

async function cmdStatus(): Promise<number> {
  const clientSessionId = sessionArgument();
  const daemon = readDaemonInfo(clientSessionId);
  console.log(daemon
    ? `Daemon: running (pid ${daemon.pid}, port ${daemon.port})`
    : 'Daemon: not running for this session. The plugin starts it when a Claude Code session starts: restart Claude Code.');

  const state = readLocalState(clientSessionId);
  console.log(`Channel: ${state.channel || '(unknown)'} — ${state.connected ? 'connected' : 'disconnected'}`);
  console.log(`You: ${state.handle || '(unknown)'}, in topic ${state.topic || '(not resolved yet)'}`);
  if (state.server) console.log(`Server: ${state.server}`);
  if (state.lastError) console.log(`Last error: ${state.lastError}`);

  console.log(`Session: ${clientSessionId}`);
  const me = state.members.find((m) => m.memberId === state.self);
  const others = me ? liveSessions(me).filter((s) => s.clientSessionId !== clientSessionId) : [];
  if (others.length > 0) console.log(`Your other sessions:\n${others.map((s) => `  - ${renderSession(s)}`).join('\n')}`);

  const peers = state.members.filter((m) => m.memberId !== state.self);
  console.log(peers.length > 0
    ? `Members:\n${peers.flatMap((m) => renderMemberLines(m, state.self, clientSessionId)).join('\n')}`
    : 'Members: none yet');

  console.log(state.claims.length > 0
    ? `Claims in this topic:\n${state.claims.map((c) => `  - ${c.ownerName}: ${c.paths.join(', ')}`).join('\n')}`
    : 'Claims in this topic: none');

  console.log(`Shared context in this topic: ${state.contextIndex.length} entries`);
  const taskLists = state.taskLists ?? [];
  console.log(taskLists.length > 0
    ? `Task lists with open tasks: ${renderTaskListsLine(taskLists)}`
    : 'Task lists with open tasks: none');
  console.log(`Unread: ${unreadMessages(clientSessionId).length}`);
  return 0;
}

async function cmdDoctor(): Promise<number> {
  const config = readConfig();
  const creds = resolveCredentials(config);
  const clientSessionId = sessionArgument();
  const problems: string[] = [];

  const line = (label: string, ok: boolean, detail: string) => {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(22)} ${detail}`);
    if (!ok) problems.push(label);
  };
  const info = (label: string, detail: string) => console.log(`  ${'--'.padEnd(4)}  ${label.padEnd(22)} ${detail}`);

  console.log('collab-channel diagnostics\n');
  line('node', true, process.version);
  line('plugin data dir', fs.existsSync(dataDir()), dataDir());

  if (config.optionsVisible) {
    line('api_endpoint', Boolean(config.apiEndpoint), config.apiEndpoint || '(not set — fill it in /config)');
    line('display_name', Boolean(config.displayNameSet), config.displayNameSet
      ? config.displayName
      : '(not set — fill it in /config; your handle comes from it)');
    line('delivery_mode', true, config.deliveryMode);
    line('topic', true, config.topic ? `${config.topic} (configured)` : `${resolveTopic(config, process.cwd())} (from the repo name)`);
  } else {
    // Guessing them here (the OS username for display_name) is what used to send people the wrong way.
    info('settings', 'not visible to this command: only the plugin\'s own processes get /config. The session below is what counts.');
  }

  const stray = strayCredentials();
  line('credentials', Boolean(creds?.secret), creds
    ? `channel "${creds.channel}" as ${creds.displayName}${creds.handle ? ` (handle ${creds.handle})` : ''}`
    : stray
      ? `(not in the plugin's folder) — an older CLI stored them in ${stray}: move that file to ${credentialsPath()}`
      : '(not joined yet: the plugin redeems the invite when a Claude Code session starts)');
  if (creds?.secret && stray) info('stray credentials', `${stray} is an older copy the plugin does not read; it can be deleted`);

  info('session', clientSessionId);
  const daemon = readDaemonInfo(clientSessionId);
  line('daemon', Boolean(daemon), daemon
    ? `pid ${daemon.pid} on 127.0.0.1:${daemon.port}`
    : '(not running — the plugin starts it when a Claude Code session starts: restart Claude Code)');

  if (daemon) {
    try {
      const status = await callDaemon<{ connected: boolean }>(clientSessionId, '/status');
      line('websocket', status.connected, status.connected ? 'connected' : 'disconnected');
    } catch (err) {
      line('websocket', false, (err as Error).message);
    }
  }

  const state = readLocalState(clientSessionId);
  if (state.fatal) line('refused by the server', false, state.fatal);
  else if (state.lastError && !state.connected) line('last error', false, state.lastError);

  const channel = readChannelStatus(clientSessionId);
  if (channel?.state === 'active') info('delivery', 'channel: pushed into the session while it is idle');
  else if (channel?.state === 'fallback') {
    // Not a failure: messages still arrive at the end of each turn.
    info('delivery', `stop, not channel: ${channel.reason ?? 'the channel is not registered'}`);
  }
  if (config.inviteCode && creds?.secret) info('invite_code', 'still set in /config but already redeemed: you can clear it');

  const logFile = path.join(sessionDir(clientSessionId), 'daemon.log');
  if (fs.existsSync(logFile)) {
    console.log(`\nLast daemon log lines (${logFile}):`);
    const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n').slice(-8);
    for (const l of lines) console.log(`  ${l}`);
  }

  console.log(problems.length === 0 ? '\nEverything checks out.' : `\n${problems.length} problem(s): ${problems.join(', ')}`);
  return problems.length === 0 ? 0 : 1;
}

const commands: Record<string, () => Promise<number>> = {
  join: cmdJoin,
  status: cmdStatus,
  doctor: cmdDoctor,
};

const command = process.argv[2] ?? 'status';
const run = commands[command];

if (!run) {
  console.error(`Unknown command "${command}". Available: ${Object.keys(commands).join(', ')}`);
  process.exitCode = 1;
} else {
  run()
    .then((code) => { process.exitCode = code; })
    .catch((err: Error) => {
      console.error(`collab-channel: ${err.message}`);
      process.exitCode = 1;
    });
}
