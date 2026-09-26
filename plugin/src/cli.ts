/**
 * Small operator CLI, used by the slash commands and for troubleshooting.
 *
 *   node dist/cli.mjs status
 *   node dist/cli.mjs join            # redeem the configured invite now
 *   node dist/cli.mjs doctor
 */
import fs from 'node:fs';
import path from 'node:path';
import { join as joinChannel } from './lib/api.js';
import {
  credentialsPath, dataDir, readConfig, resolveCredentials, resolveTopic, sessionDir, writeCredentials, type Credentials,
} from './lib/config.js';
import { callDaemon, ensureDaemon } from './lib/daemon-client.js';
import { liveSessions, renderMemberLines, renderSession } from './lib/render.js';
import { readDaemonInfo, readLocalState, unreadMessages } from './lib/state.js';

const clientSessionId = process.env.COLLAB_CLIENT_SESSION_ID ?? 'default';

async function cmdJoin(): Promise<number> {
  const config = readConfig();
  const existing = resolveCredentials(config);
  if (existing?.secret) {
    console.log(`Already joined channel "${existing.channel}" as ${existing.displayName}.`);
    console.log(`Member id: ${existing.memberId}`);
    return 0;
  }
  if (!config.apiEndpoint) {
    console.error('api_endpoint is not set. Run /config and fill in the collab-channel settings.');
    return 1;
  }
  if (!config.inviteCode) {
    console.error('invite_code is not set. Ask whoever runs the channel for a code, then add it in /config.');
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
  console.log('\nThe invite is now spent. To move the secret into your OS keychain instead,');
  console.log('paste the member id and secret into member_id and member_secret in /config and delete that file.');
  return 0;
}

async function cmdStatus(): Promise<number> {
  const state = readLocalState(clientSessionId);
  const daemon = readDaemonInfo(clientSessionId);

  if (!daemon) {
    console.log('Daemon: not running for this session (starting it...)');
    await ensureDaemon(clientSessionId).catch((err: Error) => console.error(`  failed: ${err.message}`));
    await new Promise((r) => setTimeout(r, 1200));
  } else {
    console.log(`Daemon: running (pid ${daemon.pid}, port ${daemon.port})`);
  }

  const fresh = readLocalState(clientSessionId);
  console.log(`Channel: ${fresh.channel || '(unknown)'} — ${fresh.connected ? 'connected' : 'disconnected'}`);
  console.log(`You: ${fresh.handle || '(unknown)'}, in topic ${fresh.topic || '(not resolved yet)'}`);
  if (fresh.server) console.log(`Server: ${fresh.server}`);
  if (fresh.lastError) console.log(`Last error: ${fresh.lastError}`);

  console.log(`Session: ${clientSessionId}`);
  const me = fresh.members.find((m) => m.memberId === fresh.self);
  const others = me ? liveSessions(me).filter((s) => s.clientSessionId !== clientSessionId) : [];
  if (others.length > 0) console.log(`Your other sessions:\n${others.map((s) => `  - ${renderSession(s)}`).join('\n')}`);

  const peers = fresh.members.filter((m) => m.memberId !== fresh.self);
  console.log(peers.length > 0
    ? `Members:\n${peers.flatMap((m) => renderMemberLines(m, fresh.self, clientSessionId)).join('\n')}`
    : 'Members: none yet');

  console.log(fresh.claims.length > 0
    ? `Claims in this topic:\n${fresh.claims.map((c) => `  - ${c.ownerName}: ${c.paths.join(', ')}`).join('\n')}`
    : 'Claims in this topic: none');

  console.log(`Shared context in this topic: ${fresh.contextIndex.length} entries`);
  console.log(`Unread: ${unreadMessages(clientSessionId).length}`);
  void state;
  return 0;
}

async function cmdDoctor(): Promise<number> {
  const config = readConfig();
  const creds = resolveCredentials(config);
  const problems: string[] = [];

  const line = (label: string, ok: boolean, detail: string) => {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(22)} ${detail}`);
    if (!ok) problems.push(label);
  };

  console.log('collab-channel diagnostics\n');
  line('node', true, process.version);
  line('plugin data dir', fs.existsSync(dataDir()), dataDir());
  line('api_endpoint', Boolean(config.apiEndpoint), config.apiEndpoint || '(not set — run /config)');
  line('display_name', Boolean(config.displayName), config.displayName);
  line('delivery_mode', true, config.deliveryMode);
  line('topic', true, config.topic ? `${config.topic} (configured)` : `${resolveTopic(config, process.cwd())} (from the repo name)`);
  line('credentials', Boolean(creds?.secret), creds ? `channel "${creds.channel}" as ${creds.displayName}` : '(not joined)');

  const daemon = readDaemonInfo(clientSessionId);
  line('daemon', Boolean(daemon), daemon ? `pid ${daemon.pid} on 127.0.0.1:${daemon.port}` : '(not running)');

  if (daemon) {
    try {
      const status = await callDaemon<{ connected: boolean }>(clientSessionId, '/status');
      line('websocket', status.connected, status.connected ? 'connected' : 'disconnected');
    } catch (err) {
      line('websocket', false, (err as Error).message);
    }
  }

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
