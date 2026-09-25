import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PLUGIN_VERSION } from '../src/lib/version.js';

const root = path.join(__dirname, '..', '..');
const json = (file: string) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

describe('release version', () => {
  // `claude plugin update` compares versions, not commits, and someone checking
  // any of these files should read the same number: bump with scripts/version.mjs.
  const release = json('plugin/.claude-plugin/plugin.json').version as string;

  it('is the same in the marketplace entry', () => {
    const entry = json('.claude-plugin/marketplace.json').plugins.find((p: { name: string }) => p.name === 'collab-channel');
    expect(entry.version).toBe(release);
  });

  it('leaves the catalog its own version', () => {
    expect(json('.claude-plugin/marketplace.json').version).toBe('0.1.0');
  });

  it('is the same in both package.json files', () => {
    for (const file of ['package.json', 'plugin/package.json']) {
      expect(`${file}: ${json(file).version}`).toBe(`${file}: ${release}`);
    }
  });

  it('is what the MCP server reports and the daemon subscribes with', () => {
    expect(PLUGIN_VERSION).toBe(release);
    const server = fs.readFileSync(path.join(root, 'plugin/src/mcp-server.ts'), 'utf8');
    expect(server).toContain("{ name: 'collab-channel', version: PLUGIN_VERSION }");
  });
});
