import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * Runs the committed CLI bundle the way /collab-join does: from a session's
 * Bash tool, which is not one of the plugin's processes, so neither
 * CLAUDE_PLUGIN_DATA nor the /config options are in its environment. Build
 * before testing (`pnpm build`).
 */
const cli = path.join(__dirname, '..', 'dist', 'cli.mjs');

let home: string;

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'collab-cli-'));
});

afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true });
});

const pluginRoot = () => path.join(home, '.claude', 'plugins', 'data', 'collab-channel-cognikas');
const legacyRoot = () => path.join(home, '.claude', 'collab-channel');

function run(args: string[], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8', timeout: 15_000, cwd: home,
    // os.homedir() reads USERPROFILE on Windows and HOME elsewhere. The OS user
    // is set on purpose: nothing may pass it off as a display name.
    env: { PATH: process.env.PATH, HOME: home, USERPROFILE: home, USERNAME: 'osuser', USER: 'osuser', ...env },
  });
}

function credentials(root: string): string {
  const dir = path.join(root, 'v1');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'credentials.json');
  fs.writeFileSync(file, JSON.stringify({
    apiEndpoint: 'https://collab.invalid', wsEndpoint: 'wss://collab.invalid', memberId: 'M1', secret: 's3cret',
    channel: 'team', displayName: 'Ana Pérez', handle: 'ana-perez', joinedAt: 1,
  }));
  return file;
}

const everyFile = (dir: string): string[] => (fs.existsSync(dir)
  ? fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name)
  : []);

describe('join from a Bash tool', () => {
  it('refuses to redeem the invite with settings it cannot see, and writes nothing', () => {
    const result = run(['join']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('cannot see your /config settings');
    expect(result.stderr).toContain('restart Claude Code');
    expect(everyFile(path.join(home, '.claude'))).not.toContain('credentials.json');
  });

  it('outside Claude Code, needs a display name rather than the OS username', () => {
    const result = run(['join'], {
      COLLAB_API_ENDPOINT: 'https://collab.invalid', COLLAB_INVITE_CODE: 'AAAA-BBBB-CCCC-DDDD', CLAUDE_PLUGIN_OPTION_DELIVERY_MODE: 'stop',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('display_name is not set');
    expect(result.stderr).not.toContain('osuser');
  });
});

describe('doctor from a Bash tool', () => {
  it('reads the plugin\'s own data folder without CLAUDE_PLUGIN_DATA, and guesses no settings', () => {
    credentials(pluginRoot());
    const result = run(['doctor']);
    expect(result.stdout).toContain(path.join(pluginRoot(), 'v1'));
    expect(result.stdout).toContain('channel "team" as Ana Pérez (handle ana-perez)');
    expect(result.stdout).toContain('not visible to this command');
    expect(result.stdout).not.toContain('osuser');
  });

  it('points at credentials an older CLI left outside the plugin\'s folder, with the move that fixes it', () => {
    fs.mkdirSync(path.join(pluginRoot(), 'v1'), { recursive: true });
    const stray = credentials(legacyRoot());
    const result = run(['doctor']);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(`an older CLI stored them in ${stray}`);
    expect(result.stdout).toContain(`move that file to ${path.join(pluginRoot(), 'v1', 'credentials.json')}`);
  });

  it('says a redeemed invite_code can be cleared', () => {
    credentials(pluginRoot());
    const result = run(['doctor'], { CLAUDE_PLUGIN_OPTION_INVITE_CODE: 'AAAA-BBBB-CCCC-DDDD', CLAUDE_PLUGIN_OPTION_DISPLAY_NAME: 'Ana' });
    expect(result.stdout).toContain('already redeemed: you can clear it');
  });
});

describe('status from a Bash tool', () => {
  it('never starts a daemon by hand: it would serve no session', () => {
    fs.mkdirSync(path.join(pluginRoot(), 'v1'), { recursive: true });
    const result = run(['status']);
    expect(result.stdout).toContain('not running for this session');
    expect(everyFile(pluginRoot())).not.toContain('daemon.json');
  });
});
