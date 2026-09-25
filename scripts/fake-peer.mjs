#!/usr/bin/env node
/**
 * Stands in for the second developer's session, so the plugin can be exercised
 * end to end from one machine. Speaks collab.v1 directly: the HTTP binding for
 * one-off calls, the WebSocket binding for `watch`.
 *
 *   node scripts/fake-peer.mjs join   --endpoint <url> --invite <code> --name bruno
 *   node scripts/fake-peer.mjs send   --text "finished /login" --type done --to-topic collab-global
 *   node scripts/fake-peer.mjs send   --text "a word with you" --to-user carlos
 *   node scripts/fake-peer.mjs state
 *   node scripts/fake-peer.mjs watch                       # stay connected over WebSocket
 *
 * Every command runs as one session in one topic: --topic (default "general"),
 * --session (default "fake-peer"). A message needs --to-user, --to-topic, or both.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import WebSocket from 'ws';
import {
  ChannelService, formatVersion, HEADER_CLIENT_SESSION, HEADER_MEMBER_ID, HEADER_MEMBER_SECRET, HEADER_PROTOCOL,
  HEADER_TOPIC, HEARTBEAT_SECONDS, MembershipService, PROTOCOL, rpcPath, WebSocketService,
} from '@collab/protocol';

const args = Object.fromEntries(
  process.argv.slice(3).flatMap((arg, i, all) => (arg.startsWith('--') ? [[arg.slice(2), all[i + 1] ?? true]] : [])),
);
const command = process.argv[2];
const store = args.store ?? path.join(os.tmpdir(), 'collab-fake-peer-v1.json');
const topic = args.topic ?? 'general';
const session = args.session ?? 'fake-peer';

function load() {
  try {
    return JSON.parse(fs.readFileSync(store, 'utf8'));
  } catch {
    throw new Error(`no fake peer credentials at ${store}: run "join" first`);
  }
}

/** One unary call of the HTTP binding. */
async function call(endpoint, method, body, creds) {
  const res = await fetch(`${endpoint}${rpcPath(method)}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      [HEADER_PROTOCOL]: formatVersion(PROTOCOL),
      ...(creds ? {
        [HEADER_MEMBER_ID]: creds.memberId,
        [HEADER_MEMBER_SECRET]: creds.secret,
        [HEADER_TOPIC]: topic,
        [HEADER_CLIENT_SESSION]: session,
      } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text}`);
  return text ? JSON.parse(text) : {};
}

const upper = (value) => String(value).toUpperCase();

switch (command) {
  case 'join': {
    const joined = await call(args.endpoint, MembershipService.method.join, { invite: args.invite, displayName: args.name ?? 'peer' });
    fs.writeFileSync(store, JSON.stringify({ apiEndpoint: args.endpoint, ...joined }, null, 2));
    console.log(`fake peer "${joined.displayName}" (handle ${joined.handle}) joined channel ${joined.channel}`);
    break;
  }

  case 'send': {
    const creds = load();
    if (!args['to-user'] && !args['to-topic']) throw new Error('say who it is for: --to-user <handle>, --to-topic <topic>, or both');
    const type = args.type ?? 'note';
    const text = args.text ?? 'hello from the fake peer';
    const result = await call(creds.apiEndpoint, ChannelService.method.send, {
      type: `MESSAGE_TYPE_${upper(type)}`,
      text,
      urgency: `URGENCY_${upper(args.urgency ?? 'normal')}`,
      refs: args.refs ? String(args.refs).split(',') : [],
      to: { handle: args['to-user'] ?? '', topic: args['to-topic'] ?? '' },
      ...(type === 'done' ? { done: { task: text } } : {}),
    }, creds);
    console.log(`sent #${result.seq} to ${result.delivered ?? 0} live session(s)${result.deliveredOffline ? ' (nobody else online: went out as an offline notice)' : ''}`);
    break;
  }

  case 'state': {
    const creds = load();
    const { state } = await call(creds.apiEndpoint, ChannelService.method.getState, { since: 0 }, creds);
    console.log(JSON.stringify({
      channel: state.channel,
      topic: state.topic,
      members: (state.members ?? []).map((m) => `${m.handle}:${m.status ?? 'MEMBER_STATUS_UNSPECIFIED'}${m.topics?.length ? `@${m.topics.join('|')}` : ''}`),
      claims: (state.claims ?? []).map((c) => `${c.ownerName}:${c.paths.join('|')}`),
      context: (state.contextIndex ?? []).map((e) => `${e.key}v${e.version}`),
      messages: (state.messages ?? []).length,
    }, null, 2));
    break;
  }

  case 'watch': {
    // Holds a real socket so the peer shows as online, and prints whatever the
    // channel pushes. This is the half that makes a live test look real.
    const creds = load();
    const ticket = await call(creds.apiEndpoint, WebSocketService.method.issueTicket, {}, creds);
    const ws = new WebSocket(`${ticket.wsEndpoint || creds.wsEndpoint}?ticket=${encodeURIComponent(ticket.ticket)}`);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        subscribe: {
          client: { name: 'fake-peer', version: '1.0.0', protocol: { major: PROTOCOL.major, minor: PROTOCOL.minor } },
          repo: 'peer-machine',
          branch: 'feature/login',
        },
      }));
      // Keeps presence fresh; the server treats a silent member as offline.
      setInterval(() => ws.send(JSON.stringify({ heartbeat: {} })), HEARTBEAT_SECONDS * 1000);
    });

    ws.on('message', (data) => {
      const frame = JSON.parse(data.toString());
      if (frame.hello) {
        console.log(`subscribed as ${creds.displayName} on ${creds.channel}, topic ${topic} (server ${frame.hello.serverVersion ?? '?'})`);
      } else if (frame.message) {
        const m = frame.message;
        const to = [m.to?.handle, m.to?.topic && `#${m.to.topic}`].filter(Boolean).join(' in ');
        const type = String(m.type ?? 'MESSAGE_TYPE_NOTE').replace('MESSAGE_TYPE_', '').toLowerCase();
        console.log(`  <- #${m.seq} ${m.fromHandle}@${m.fromTopic} → ${to} [${type}]: ${String(m.text ?? '').replace(/\r?\n/g, ' / ')}`);
      } else if (frame.presence) {
        const members = frame.presence.members ?? [];
        console.log(`  <- presence: ${members.map((m) => `${m.handle}:${String(m.status ?? '').replace('MEMBER_STATUS_', '').toLowerCase()}${m.topics?.length ? `@${m.topics.join('|')}` : ''}`).join(', ')}`);
      } else if (frame.error) {
        console.log(`  <- error ${frame.error.code}: ${frame.error.message}`);
      }
    });

    ws.on('close', () => { console.log('disconnected'); process.exit(0); });
    ws.on('error', (err) => { console.error('socket error:', err.message); process.exit(1); });
    break;
  }

  default:
    console.error('Commands: join, send, state, watch');
    process.exit(1);
}
