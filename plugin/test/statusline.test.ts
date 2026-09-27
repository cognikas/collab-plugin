import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/** Runs the committed bundle as a status line script would, so build before testing (`pnpm build`). */
const statusline = path.join(__dirname, '..', 'dist', 'statusline.mjs');

let home: string;

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'collab-statusline-'));
});

afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true });
});

function session(id: string, state: object, marketplace = 'cognikas'): void {
  const dir = path.join(home, '.claude', 'plugins', 'data', `collab-channel-${marketplace}`, 'v1', 'sessions', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(state));
  fs.writeFileSync(path.join(dir, 'inbox.jsonl'), `${JSON.stringify({ seq: 7, channel: 'team', fromMemberId: 'P', fromName: 'ana',
    fromHandle: 'ana', fromTopic: 't1', to: { topic: 't1' }, type: 'note', text: 'hi', urgency: 'normal', sentAt: 0 })}\n`);
}

function run(input: string, env: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [statusline], {
    input, encoding: 'utf8', timeout: 10_000,
    // As from a status line script: HOME is the user's, and CLAUDE_PLUGIN_DATA is unset or some other plugin's.
    env: { PATH: process.env.PATH, HOME: home, ...env },
  });
}

describe('the status line command', () => {
  it('finds the session under the plugin\'s data, whatever CLAUDE_PLUGIN_DATA says, and prints one line', () => {
    session('s1', { connected: true, channel: 'team', self: 'ME', topic: 't1', tasks: [], tasksStale: false });
    const result = run(JSON.stringify({ session_id: 's1', cwd: '/tmp' }), { CLAUDE_PLUGIN_DATA: path.join(home, 'other-plugin') });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('collab ● 1 unread\n');
  });

  it('prints nothing for a session that is not on the channel, or input it cannot read', () => {
    session('s1', { connected: true, channel: 'team', self: 'ME', topic: 't1' });
    for (const input of [JSON.stringify({ session_id: 'unknown' }), JSON.stringify({ session_id: '../s1' }), 'not json', '']) {
      const result = run(input);
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('');
    }
  });
});
