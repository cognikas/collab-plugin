import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Message } from '../src/lib/model.js';
import { appendInbox, readCursor, writeCursor } from '../src/lib/state.js';

/**
 * Runs the committed hook bundle as Claude Code would, so build before testing
 * (`pnpm build`). It needs no daemon and no network: that is the point of hooks.
 */
const hook = path.join(__dirname, '..', 'dist', 'hook.mjs');

let tempDir: string;
let env: NodeJS.ProcessEnv;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collab-stop-'));
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

function stop() {
  return spawnSync(process.execPath, [hook, 'Stop'], {
    input: JSON.stringify({ session_id: 's1', hook_event_name: 'Stop' }),
    env, encoding: 'utf8', timeout: 15_000,
  });
}

describe('the Stop hook loop guard', () => {
  it('interrupts exactly once for two Stops in a row', () => {
    appendInbox('s1', message(5));

    const first = stop();
    expect(first.status).toBe(2);
    expect(first.stderr).toContain('#5 ana@t1');
    expect(first.stderr).toContain('not by your user');
    // Advanced before blocking, so the next Stop finds nothing unread.
    expect(readCursor('s1').delivered).toBe(5);

    const second = stop();
    expect(second.status).toBe(0);
    expect(second.stderr).toBe('');
  });

  it('holds back even a new message for the cooldown, then delivers it', () => {
    appendInbox('s1', message(5));
    expect(stop().status).toBe(2);

    appendInbox('s1', message(6));
    expect(stop().status).toBe(0);

    // Once the 4 s cooldown is over, the new one gets through.
    writeCursor('s1', { lastBlockAt: 0 });
    const later = stop();
    expect(later.status).toBe(2);
    expect(later.stderr).toContain('#6');
    expect(later.stderr).not.toContain('#5');
  });
});
