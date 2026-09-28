import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Message } from '../src/lib/model.js';
import { appendInbox, readCursor, writeCursor, writeLocalState } from '../src/lib/state.js';

/**
 * Runs the committed hook bundle as Claude Code would, so build before testing
 * (`pnpm build`), like stop-guard.test.ts.
 */
const hook = path.join(__dirname, '..', 'dist', 'hook.mjs');
const hooksJson = path.join(__dirname, '..', 'hooks', 'hooks.json');

let tempDir: string;
let env: NodeJS.ProcessEnv;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collab-hooks-'));
  process.env.CLAUDE_PLUGIN_DATA = tempDir;
  env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('CLAUDE_PLUGIN_OPTION_') && !key.startsWith('COLLAB_')));
  Object.assign(env, {
    CLAUDE_PLUGIN_DATA: tempDir,
    // Configured, not yet joined: enough for the hooks to act, with nothing to reach.
    CLAUDE_PLUGIN_OPTION_API_ENDPOINT: 'https://collab.invalid',
    CLAUDE_PLUGIN_OPTION_INVITE_CODE: 'AAAA-BBBB-CCCC-DDDD',
    CLAUDE_PLUGIN_OPTION_DELIVERY_MODE: 'stop',
  });
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
  delete process.env.CLAUDE_PLUGIN_DATA;
});

function message(seq: number): Message {
  return {
    seq, channel: 'team', fromMemberId: 'PEER', fromName: 'ana', fromHandle: 'ana', fromTopic: 't1', to: { topic: 't1' },
    type: 'note', text: `message ${seq}`, urgency: 'normal', sentAt: Date.now(),
  };
}

function sessionStart(source: string) {
  return spawnSync(process.execPath, [hook, 'SessionStart'], {
    input: JSON.stringify({ session_id: 's1', hook_event_name: 'SessionStart', source, cwd: tempDir }),
    env, encoding: 'utf8', timeout: 15_000,
  });
}

/**
 * Stands in for dist/daemon.mjs: registers like the real one, answers
 * /shutdown, and writes down that it was asked. Needs no network.
 *
 * On /shutdown it also removes its own registration, as the real one does
 * (clearDaemonInfo). That matters here more than it seems: this test process is
 * the fake's parent and sits blocked in spawnSync while the hook runs, so an
 * exited fake stays a zombie that `isAlive` still counts as running, and a
 * registration left behind would simply be reused.
 */
const FAKE_DAEMON = `
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
const id = process.env.COLLAB_CLIENT_SESSION_ID;
const dir = path.join(process.env.CLAUDE_PLUGIN_DATA, 'v1', 'sessions', id);
fs.mkdirSync(dir, { recursive: true });
function unregister() {
  const file = path.join(dir, 'daemon.json');
  try { if (JSON.parse(fs.readFileSync(file, 'utf8')).pid === process.pid) fs.unlinkSync(file); } catch {}
}
const server = http.createServer((req, res) => {
  if (req.url === '/shutdown') {
    fs.appendFileSync(path.join(dir, 'shutdowns.log'), process.pid + '\\n');
    unregister();
  }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end('{"ok":true}');
  if (req.url === '/shutdown') setTimeout(() => process.exit(0), 20);
});
server.listen(0, '127.0.0.1', () => {
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify({ connected: true }));
  fs.writeFileSync(path.join(dir, 'daemon.json'), JSON.stringify({
    pid: process.pid, port: server.address().port, token: 'fake', startedAt: Date.now(), clientSessionId: id,
    cwd: process.cwd(), claudePid: Number(process.env.COLLAB_CLAUDE_PID) || undefined,
  }));
});
setTimeout(() => process.exit(0), 30000);
`;

describe('a session start', () => {
  let root: string;
  const sessionsDir = () => path.join(tempDir, 'v1', 'sessions');
  const registration = (id: string) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(sessionsDir(), id, 'daemon.json'), 'utf8')) as { pid: number; claudePid?: number };
    } catch {
      return undefined;
    }
  };
  const shutdowns = (id: string) => {
    try {
      return fs.readFileSync(path.join(sessionsDir(), id, 'shutdowns.log'), 'utf8').split('\n').filter(Boolean).map(Number);
    } catch {
      return [];
    }
  };

  async function startFake(id: string, claudePid: number): Promise<number> {
    const child = spawn(process.execPath, [path.join(root, 'dist', 'daemon.mjs')], {
      env: { ...env, COLLAB_CLIENT_SESSION_ID: id, COLLAB_CLAUDE_PID: String(claudePid) }, stdio: 'ignore',
    });
    child.unref();
    for (let i = 0; i < 100 && !registration(id); i++) await new Promise((r) => setTimeout(r, 50));
    return child.pid!;
  }

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'collab-root-'));
    fs.mkdirSync(path.join(root, 'dist'));
    fs.writeFileSync(path.join(root, 'dist', 'daemon.mjs'), FAKE_DAEMON);
  });

  afterEach(() => {
    for (const id of fs.existsSync(sessionsDir()) ? fs.readdirSync(sessionsDir()) : []) {
      const pid = registration(id)?.pid;
      if (pid) { try { process.kill(pid); } catch { /* already gone */ } }
    }
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('retires the daemons this process left behind and replaces its own from an earlier process', async () => {
    // The hook's parent, as Claude Code is for a real hook, is this test process.
    const beforeClear = await startFake('before-clear', process.pid);
    const fromEarlierProcess = await startFake('s1', 999_999);
    const otherWindow = await startFake('other-window', 888_888);

    const result = spawnSync(process.execPath, [hook, 'SessionStart'], {
      input: JSON.stringify({ session_id: 's1', hook_event_name: 'SessionStart', source: 'resume', cwd: tempDir }),
      env: { ...env, CLAUDE_PLUGIN_ROOT: root }, encoding: 'utf8', timeout: 20_000,
    });
    expect(result.status).toBe(0);

    expect(shutdowns('before-clear')).toEqual([beforeClear]);
    expect(shutdowns('s1')).toEqual([fromEarlierProcess]);
    // A fresh daemon took the session, paired with this process.
    expect(registration('s1')?.pid).not.toBe(fromEarlierProcess);
    expect(registration('s1')?.claudePid).toBe(process.pid);
    // Another Claude Code process's session is none of its business.
    expect(shutdowns('other-window')).toEqual([]);
    expect(registration('other-window')?.pid).toBe(otherWindow);
  }, 30_000);

  it('shows the unread backlog oldest first, and marks delivered only what it showed', async () => {
    // This process runs the session: its own daemon is kept, so nothing reaches the network.
    await startFake('s1', process.pid);
    writeLocalState('s1', { channel: 'team', topic: 't1', connected: true });
    for (let seq = 1; seq <= 12; seq++) appendInbox('s1', message(seq));

    const result = spawnSync(process.execPath, [hook, 'SessionStart'], {
      input: JSON.stringify({ session_id: 's1', hook_event_name: 'SessionStart', source: 'startup', cwd: tempDir }),
      env: { ...env, CLAUDE_PLUGIN_ROOT: root }, encoding: 'utf8', timeout: 20_000,
    });
    expect(result.status).toBe(0);

    const context = (JSON.parse(result.stdout) as { hookSpecificOutput: { additionalContext: string } })
      .hookSpecificOutput.additionalContext;
    expect(context).toContain('12 unread message(s), the oldest 10 below.');
    expect(context).toContain('#1 ana@t1');
    expect(context).toContain('#10 ana@t1');
    expect(context).not.toContain('#11 ana@t1');
    expect(context).toContain('2 more unread after #10, not shown yet');
    // The two it did not show stay unread for the Stop hook or collab_inbox.
    expect(readCursor('s1').delivered).toBe(10);
  }, 30_000);

  it('says who is doing what in the topic, from the tasks the daemon read', async () => {
    await startFake('s1', process.pid);
    const list = { key: 'rc5', topic: 't1', title: 'rc.5', createdByName: 'ana', createdAt: 0, updatedAt: 0,
      open: 0, inProgress: 1, done: 0, dismissed: 0 };
    writeLocalState('s1', {
      channel: 'team', topic: 't1', connected: true, self: 'ME', taskLists: [list], tasksStale: false,
      tasks: [{ list: 'rc5', topic: 't1', number: 2, title: 'Fix the startup summary', status: 'in_progress',
        createdByMemberId: 'PEER', createdByName: 'ana', createdAt: 0, progressCount: 1, updatedAt: 0,
        holder: { memberId: 'PEER', handle: 'ana', name: 'Ana', clientSessionId: 's-a1', since: Date.now() },
        lastProgress: { text: 'half way', percent: 50, authorName: 'Ana', at: Date.now() } }],
    });

    const result = spawnSync(process.execPath, [hook, 'SessionStart'], {
      input: JSON.stringify({ session_id: 's1', hook_event_name: 'SessionStart', source: 'startup', cwd: tempDir }),
      env: { ...env, CLAUDE_PLUGIN_ROOT: root }, encoding: 'utf8', timeout: 20_000,
    });
    expect(result.status).toBe(0);
    const context = (JSON.parse(result.stdout) as { hookSpecificOutput: { additionalContext: string } })
      .hookSpecificOutput.additionalContext;
    expect(context).toContain('In progress in this topic:\n  - ana (session s-a1): rc5#2 Fix the startup summary — 50%, 0s ago');
  }, 30_000);

  it('ends with SessionEnd asking the session\'s daemon to stop', async () => {
    const daemon = await startFake('s1', process.pid);
    const result = spawnSync(process.execPath, [hook, 'SessionEnd'], {
      input: JSON.stringify({ session_id: 's1', hook_event_name: 'SessionEnd', reason: 'prompt_input_exit' }),
      env: { ...env, CLAUDE_PLUGIN_ROOT: root }, encoding: 'utf8', timeout: 20_000,
    });
    expect(result.status).toBe(0);
    expect(shutdowns('s1')).toEqual([daemon]);
  }, 30_000);
});

describe('after a compaction', () => {
  it('re-shows the last messages as SessionStart context, and marks nothing delivered', () => {
    writeLocalState('s1', { channel: 'team', topic: 't1', connected: true });
    appendInbox('s1', message(5));
    appendInbox('s1', message(6));
    writeCursor('s1', { delivered: 6 });

    const result = sessionStart('compact');

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout) as { hookSpecificOutput: { hookEventName: string; additionalContext: string } };
    // PostCompact output cannot carry context; Claude Code rejects its hookEventName.
    expect(output.hookSpecificOutput.hookEventName).toBe('SessionStart');
    expect(output.hookSpecificOutput.additionalContext).toContain('Last 2 message(s)');
    expect(output.hookSpecificOutput.additionalContext).toContain('#6 ana@t1');
    expect(readCursor('s1').delivered).toBe(6);
    // The daemon is already running by then: nothing is started for it.
    expect(fs.existsSync(path.join(tempDir, 'v1', 'sessions', 's1', 'daemon.json'))).toBe(false);
  });

  it('comes from SessionStart, which fires for every source, and not from PostCompact', () => {
    const hooks = (JSON.parse(fs.readFileSync(hooksJson, 'utf8')) as { hooks: Record<string, Array<{ matcher?: string }>> }).hooks;
    expect(hooks.PostCompact).toBeUndefined();
    expect(hooks.SessionStart?.every((entry) => entry.matcher === undefined)).toBe(true);
  });
});
