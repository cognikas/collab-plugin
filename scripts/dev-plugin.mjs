#!/usr/bin/env node
/**
 * Builds .dev-plugin/collab-channel/: a copy of plugin/ to load with
 *   claude --plugin-dir .dev-plugin/collab-channel
 * so 1.0 can be tried next to an installed 0.6 without a marketplace.
 *
 * Why a copy: a plugin loaded from a folder has no stored options, and Claude
 * Code refuses to start an MCP server whose .mcp.json references an unset
 * `${user_config.*}` ("Plugin option \"api_endpoint\" isn't set"). The copy's
 * .mcp.json drops that mapping, so its MCP server inherits COLLAB_* from the
 * shell, the same fallback the hooks use. Options reach MCP servers only
 * through that mapping, so the real .mcp.json must keep it.
 */
import fs from 'node:fs';
import path from 'node:path';

const source = 'plugin';
const target = path.join('.dev-plugin', 'collab-channel');
const INCLUDE = ['.claude-plugin', '.mcp.json', 'commands', 'dist', 'hooks', 'skills'];

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
for (const entry of INCLUDE) {
  fs.cpSync(path.join(source, entry), path.join(target, entry), { recursive: true });
}

const mcpFile = path.join(target, '.mcp.json');
const mcp = JSON.parse(fs.readFileSync(mcpFile, 'utf8'));
for (const server of Object.values(mcp.mcpServers)) delete server.env;
fs.writeFileSync(mcpFile, `${JSON.stringify(mcp, null, 2)}\n`);

console.log(`Built ${target}. In a separate session, with the 1.0 backend's values:

  export COLLAB_API_ENDPOINT=<HttpEndpoint of CollabBackendStack>
  export COLLAB_INVITE_CODE=<an invite from the 1.0 backend>
  export COLLAB_DISPLAY_NAME=<your name>
  claude --plugin-dir ${path.resolve(target)}
`);
