import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DaemonUnavailable, ensureDaemon } from '../src/lib/daemon-client.js';
import { writeLocalState } from '../src/lib/state.js';

let dataDir: string;
let pluginRoot: string;

beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collab-start-data-'));
  pluginRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'collab-start-root-'));
  process.env.CLAUDE_PLUGIN_DATA = dataDir;
  process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;
});

afterEach(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
  fs.rmSync(pluginRoot, { recursive: true, force: true });
  delete process.env.CLAUDE_PLUGIN_DATA;
  delete process.env.CLAUDE_PLUGIN_ROOT;
});

/** Stands in for dist/daemon.mjs. `failing` dies the way the real one does when main() throws. */
function fakeDaemon(failing: boolean): void {
  fs.mkdirSync(path.join(pluginRoot, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(pluginRoot, 'dist', 'daemon.mjs'), failing
    ? `
import fs from 'node:fs';
import path from 'node:path';
const dir = path.join(process.env.CLAUDE_PLUGIN_DATA, 'v1', 'sessions', process.env.COLLAB_CLIENT_SESSION_ID);
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, 'state.json');
let state = {};
try { state = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
fs.writeFileSync(file, JSON.stringify({ ...state, connected: false, failedAt: Date.now(),
  lastError: 'INVALID_INVITE: Invite code was already used or has expired' }));
process.exit(1);
`
    : 'setTimeout(() => process.exit(0), 5000);\n');
}

describe('a daemon that does not start', () => {
  it('says why it died, as soon as it dies, rather than only timing out', async () => {
    fakeDaemon(true);
    const started = Date.now();
    const failure = await ensureDaemon('s1', 6_000).catch((err: unknown) => err);
    expect(failure).toBeInstanceOf(DaemonUnavailable);
    expect((failure as Error).message).toBe(
      'the collab-channel daemon could not start: INVALID_INVITE: Invite code was already used or has expired',
    );
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it('does not blame it on the failure of an earlier daemon', async () => {
    writeLocalState('s1', { lastError: 'an old failure', failedAt: Date.now() - 60_000 });
    fakeDaemon(false);
    await expect(ensureDaemon('s1', 700)).rejects.toThrow('the collab-channel daemon did not start in time');
  });
});
