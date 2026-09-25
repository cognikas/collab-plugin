import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { credentialsPath, dataDir, readConfig, resolveCredentials, writeCredentials, type Credentials } from '../src/lib/config.js';

let tempDir: string;
const saved = { ...process.env };

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collab-creds-'));
  process.env = Object.fromEntries(Object.entries(saved).filter(([key]) => !key.startsWith('CLAUDE_PLUGIN_OPTION_')));
  process.env.CLAUDE_PLUGIN_DATA = tempDir;
});

afterEach(() => {
  process.env = { ...saved };
  fs.rmSync(tempDir, { recursive: true, force: true });
});

const creds = (overrides: Partial<Credentials> = {}): Credentials => ({
  apiEndpoint: 'https://v1.example', wsEndpoint: 'wss://v1.example', memberId: 'M1', secret: 's3cret',
  channel: 'team', displayName: 'Ana', handle: 'ana', joinedAt: 1, ...overrides,
});

describe('settings a session gets from its environment', () => {
  it('falls back to COLLAB_* when a plugin option arrives unset, as with --plugin-dir', () => {
    process.env.CLAUDE_PLUGIN_OPTION_API_ENDPOINT = '${user_config.api_endpoint}';
    process.env.CLAUDE_PLUGIN_OPTION_INVITE_CODE = '';
    process.env.COLLAB_API_ENDPOINT = 'https://v1.example/';
    process.env.COLLAB_INVITE_CODE = 'AAAA-BBBB-CCCC-DDDD';
    process.env.COLLAB_DISPLAY_NAME = 'Ana';
    expect(readConfig()).toMatchObject({ apiEndpoint: 'https://v1.example', inviteCode: 'AAAA-BBBB-CCCC-DDDD', displayName: 'Ana' });
  });

  it('lets a configured plugin option win', () => {
    process.env.CLAUDE_PLUGIN_OPTION_API_ENDPOINT = 'https://option.example';
    process.env.COLLAB_API_ENDPOINT = 'https://env.example';
    expect(readConfig().apiEndpoint).toBe('https://option.example');
  });
});

describe('where 1.0 keeps its credentials and state', () => {
  it('is a v1 folder of the plugin data, apart from 0.6\'s files', () => {
    expect(dataDir()).toBe(path.join(tempDir, 'v1'));
    expect(credentialsPath()).toBe(path.join(tempDir, 'v1', 'credentials.json'));
  });

  it('never reads 0.6\'s credentials, which sit one folder up', () => {
    fs.writeFileSync(path.join(tempDir, 'credentials.json'), JSON.stringify({ sessionId: 'OLD', secret: 'x', apiEndpoint: 'https://v1.example' }));
    process.env.CLAUDE_PLUGIN_OPTION_API_ENDPOINT = 'https://v1.example';
    expect(resolveCredentials(readConfig())).toBeUndefined();
  });

  it('uses stored credentials only against the backend that issued them', () => {
    writeCredentials(creds());
    process.env.CLAUDE_PLUGIN_OPTION_API_ENDPOINT = 'https://v1.example/';
    expect(resolveCredentials(readConfig())?.memberId).toBe('M1');
    process.env.CLAUDE_PLUGIN_OPTION_API_ENDPOINT = 'https://another.example';
    expect(resolveCredentials(readConfig())).toBeUndefined();
  });

  it('prefers a member id and secret from the keychain, and ignores unset placeholders', () => {
    writeCredentials(creds());
    process.env.CLAUDE_PLUGIN_OPTION_API_ENDPOINT = 'https://v1.example';
    process.env.CLAUDE_PLUGIN_OPTION_MEMBER_ID = 'M2';
    process.env.CLAUDE_PLUGIN_OPTION_MEMBER_SECRET = 'from-keychain';
    expect(resolveCredentials(readConfig())).toMatchObject({ memberId: 'M2', secret: 'from-keychain', channel: 'team' });

    process.env.CLAUDE_PLUGIN_OPTION_MEMBER_ID = '${user_config.member_id}';
    process.env.CLAUDE_PLUGIN_OPTION_MEMBER_SECRET = '${user_config.member_secret}';
    expect(resolveCredentials(readConfig())?.memberId).toBe('M1');
  });
});
