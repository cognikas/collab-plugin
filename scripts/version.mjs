#!/usr/bin/env node
/**
 * Sets the release version everywhere it lives, so a bump is one command.
 *
 *   node scripts/version.mjs 1.0.0
 *
 * `claude plugin update` only compares plugin.json and the marketplace entry;
 * the package.json files and PLUGIN_VERSION (the MCP serverInfo, and the
 * ClientInfo the daemon subscribes with) follow them so that nobody checking
 * any one of them reads a different number. plugin/test/versions.test.ts fails
 * if they drift apart.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const next = process.argv[2];
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/.test(next ?? '')) {
  console.error('Usage: node scripts/version.mjs <major.minor.patch[-pre]>');
  process.exit(1);
}

/** Replaces exactly one match, so a changed file layout fails loudly instead of silently. */
function replaceOnce(file, pattern, replacement) {
  const target = path.join(root, file);
  const text = fs.readFileSync(target, 'utf8');
  const matches = text.match(new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`)) ?? [];
  if (matches.length !== 1) throw new Error(`${file}: expected one version to replace, found ${matches.length}`);
  fs.writeFileSync(target, text.replace(pattern, replacement));
  console.log(`  ${file}`);
}

const jsonVersion = /("version":\s*")[^"]+(")/;

for (const file of ['plugin/.claude-plugin/plugin.json', 'package.json', 'plugin/package.json']) {
  replaceOnce(file, jsonVersion, `$1${next}$2`);
}
// The catalog has its own top-level version; only the plugin's entry moves.
replaceOnce('.claude-plugin/marketplace.json', /("name":\s*"collab-channel",[\s\S]*?"version":\s*")[^"]+(")/, `$1${next}$2`);
replaceOnce('plugin/src/lib/version.ts', /(PLUGIN_VERSION = ')[^']+(')/, `$1${next}$2`);

console.log(`\nVersion set to ${next}. Rebuild with: pnpm build`);
