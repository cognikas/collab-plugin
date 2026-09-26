#!/usr/bin/env node
/**
 * Speaks MCP over stdio to the plugin's server and exercises its tools, so the
 * tool surface can be verified without launching Claude Code.
 *
 *   COLLAB_API_ENDPOINT=<url> node scripts/mcp-check.mjs --invite <code>
 *   COLLAB_API_ENDPOINT=<url> COLLAB_ADMIN_KEY=<key> node scripts/mcp-check.mjs
 *
 * Runs against a throwaway channel with its own data directory, so it never
 * writes context or claims into a channel people are using. Either pass an
 * invite for one, minted in collab-backend with
 * `node scripts/invite.mjs --channel mcpcheck-<something> --label mcp-check`,
 * which needs no admin key here; or set COLLAB_ADMIN_KEY and it mints one itself.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AdminService, formatVersion, HEADER_ADMIN_KEY, HEADER_PROTOCOL, PROTOCOL, rpcPath } from '@collab/protocol';

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((arg, i, all) => (arg.startsWith('--') ? [[arg.slice(2), all[i + 1] ?? true]] : [])),
);

const endpoint = String(args.endpoint ?? process.env.COLLAB_API_ENDPOINT ?? '').replace(/[/]+$/, '');
if (!endpoint) {
  console.error('Set COLLAB_API_ENDPOINT (or --endpoint) to the 1.0 backend, plus --invite <code> or COLLAB_ADMIN_KEY.');
  process.exit(1);
}

async function mintInvite() {
  const adminKey = process.env.COLLAB_ADMIN_KEY;
  if (!adminKey) throw new Error('pass --invite <code> for a throwaway channel, or set COLLAB_ADMIN_KEY to mint one');
  const channel = `mcpcheck-${Date.now().toString(36)}`;
  const res = await fetch(`${endpoint}${rpcPath(AdminService.method.createInvite)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', [HEADER_PROTOCOL]: formatVersion(PROTOCOL), [HEADER_ADMIN_KEY]: adminKey },
    body: JSON.stringify({ channel, label: 'mcp-check' }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`could not mint an invite: ${res.status} ${JSON.stringify(body)}`);
  return { invite: body.invite, channel };
}

const { invite, channel } = typeof args.invite === 'string'
  ? { invite: args.invite, channel: '(the invite\'s)' }
  : await mintInvite();
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collab-mcp-check-'));
console.log(`\nChannel: ${channel} on ${endpoint}`);

// Only what the plugin would get from Claude Code, pointed at the throwaway
// channel. Inherited plugin options would aim it at a real one.
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('CLAUDE_PLUGIN_OPTION_')));
Object.assign(env, {
  CLAUDE_PLUGIN_DATA: dataDir,
  COLLAB_API_ENDPOINT: endpoint,
  COLLAB_INVITE_CODE: invite,
  COLLAB_DISPLAY_NAME: 'mcp-check',
  COLLAB_CLIENT_SESSION_ID: 'mcp-check',
  COLLAB_TOPIC: 'mcp-check-topic',
});

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT ?? path.join(process.cwd(), 'plugin');
const child = spawn(process.execPath, [path.join(pluginRoot, 'dist', 'mcp-server.mjs')], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env,
});

child.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));

let buffer = '';
const pending = new Map();
let nextId = 1;

child.stdout.on('data', (chunk) => {
  buffer += chunk.toString();
  let index;
  while ((index = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line) continue;

    const message = JSON.parse(line);
    const resolve = pending.get(message.id);
    if (resolve) {
      pending.delete(message.id);
      resolve(message);
    }
  }
});

function send(method, params) {
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
}

function notify(method, params) {
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
}

let passed = 0;
let failed = 0;
function check(label, ok, detail = '') {
  if (ok) { passed++; console.log(`  PASS  ${label}`); }
  else { failed++; console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`); }
}

const init = await send('initialize', {
  protocolVersion: '2025-06-18',
  capabilities: {},
  clientInfo: { name: 'mcp-check', version: '0' },
});
check('initialize', init.result?.serverInfo?.name === 'collab-channel', JSON.stringify(init.error ?? init.result));
console.log(`  serverInfo: ${init.result?.serverInfo?.name} ${init.result?.serverInfo?.version}`);
notify('notifications/initialized', {});

const list = await send('tools/list', {});
const tools = list.result?.tools ?? [];
console.log(`\nTools exposed (${tools.length}):`);
for (const tool of tools) console.log(`  - ${tool.name}`);

const expected = [
  'collab_status', 'collab_inbox', 'collab_send', 'collab_done', 'collab_wait',
  'collab_context_put', 'collab_context_get', 'collab_context_list',
  'collab_claim', 'collab_claims', 'collab_release',
];
console.log('');
check('all tools registered', expected.every((name) => tools.some((t) => t.name === name)),
  expected.filter((n) => !tools.some((t) => t.name === n)).join(', '));
check('every tool has a JSON Schema', tools.every((t) => t.inputSchema?.type === 'object'));
check('every tool has a description', tools.every((t) => (t.description ?? '').length > 30));

async function call(name, toolArgs = {}) {
  const res = await send('tools/call', { name, arguments: toolArgs });
  return res.result ?? { content: [{ text: JSON.stringify(res.error) }], isError: true };
}

console.log('\nCalling tools:');
const status = await call('collab_status');
check('collab_status responds', !status.isError, status.content?.[0]?.text);
console.log(`    ${status.content?.[0]?.text?.split('\n').join('\n    ')}`);
check('collab_status names the topic', status.content?.[0]?.text?.includes('in topic mcp-check-topic'), status.content?.[0]?.text);
check('collab_status names this session', /in topic mcp-check-topic, session \S+/.test(status.content?.[0]?.text ?? ''),
  status.content?.[0]?.text);

// Low, because nobody else is on this channel: a normal one would go out by email.
const sent = await call('collab_send', { text: 'hello from mcp-check', topic: 'mcp-check-topic', urgency: 'low' });
check('collab_send to a topic works', !sent.isError && /^Sent \(#\d+\)/.test(sent.content?.[0]?.text ?? ''), sent.content?.[0]?.text);

const toSelf = await call('collab_send', { text: 'a note to my other sessions', user: 'mcp-check' });
check('collab_send to a user works', !toSelf.isError, toSelf.content?.[0]?.text);

const unaddressed = await call('collab_send', { text: 'to whom?' });
check('collab_send without a recipient is an error that says how to address',
  unaddressed.isError === true && /topic/.test(unaddressed.content?.[0]?.text ?? ''), unaddressed.content?.[0]?.text);

const notConnected = await call('collab_send', { text: 'hi', user: 'mcp-check', session: 'not-connected-1' });
check('collab_send to a session that is not connected is refused before sending',
  notConnected.isError === true && /not connected/.test(notConnected.content?.[0]?.text ?? ''), notConnected.content?.[0]?.text);

const unknownUser = await call('collab_send', { text: 'hi', user: 'nobody-here' });
check('collab_send to an unknown handle is an error', unknownUser.isError === true && /UNKNOWN_HANDLE|No member/.test(unknownUser.content?.[0]?.text ?? ''),
  unknownUser.content?.[0]?.text);

const done = await call('collab_done', { task: 'checked the MCP surface', topic: 'mcp-check-topic' });
check('collab_done works', !done.isError && /Announced as done/.test(done.content?.[0]?.text ?? ''), done.content?.[0]?.text);

const ctxPut = await call('collab_context_put', {
  key: 'mcp-check',
  title: 'Verified from mcp-check',
  summary: 'written by the MCP tool surface test',
  body: 'If you can read this back, the whole path works.',
});
check('collab_context_put works', !ctxPut.isError, ctxPut.content?.[0]?.text);

const ctxGet = await call('collab_context_get', { key: 'mcp-check' });
check('collab_context_get reads it back',
  !ctxGet.isError && ctxGet.content[0].text.includes('the whole path works'),
  ctxGet.content?.[0]?.text);

const ctxElsewhere = await call('collab_context_get', { key: 'mcp-check', topic: 'another-topic' });
check('context written in one topic is not in another', ctxElsewhere.isError === true, ctxElsewhere.content?.[0]?.text);

const big = await call('collab_context_put', {
  key: 'mcp-check-big',
  title: 'Bigger than a WebSocket frame',
  summary: 'goes over HTTP',
  body: 'x'.repeat(150_000),
});
check('collab_context_put of 150 000 characters works (over HTTP)', !big.isError, big.content?.[0]?.text);

const claim = await call('collab_claim', { paths: ['src/api/**'], note: 'mcp-check', ttlMinutes: 5 });
check('collab_claim works', !claim.isError, claim.content?.[0]?.text);

const claimId = claim.content?.[0]?.text?.match(/id ([0-9A-Za-z_-]+)\)/)?.[1];
if (claimId) {
  const release = await call('collab_release', { claimId });
  check('collab_release works', !release.isError && release.content[0].text.includes('released'), release.content?.[0]?.text);
} else {
  check('collab_release works', false, 'could not parse the claim id');
}

const inbox = await call('collab_inbox', { markRead: false });
check('collab_inbox responds', !inbox.isError, inbox.content?.[0]?.text);

const unknown = await send('tools/call', { name: 'collab_nope', arguments: {} });
check('unknown tool is reported as an error', unknown.result?.isError === true || Boolean(unknown.error));

child.kill();

// The server autostarted a detached daemon; left alone it would hold the
// socket for 12 hours.
try {
  const daemon = JSON.parse(fs.readFileSync(path.join(dataDir, 'v1', 'sessions', 'mcp-check', 'daemon.json'), 'utf8'));
  await fetch(`http://127.0.0.1:${daemon.port}/shutdown`, { method: 'POST', headers: { 'x-collab-token': daemon.token } });
  await new Promise((r) => setTimeout(r, 300));
} catch { /* never started, or already gone */ }
try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch { /* a daemon still exiting holds a handle */ }

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
