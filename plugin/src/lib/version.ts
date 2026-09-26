/**
 * This plugin's release. The MCP server reports it as its serverInfo, and the
 * daemon sends it as ClientInfo when it subscribes. Set it with
 * scripts/version.mjs, never by hand: plugin/test/versions.test.ts checks it
 * against plugin.json, the marketplace entry and both package.json files.
 */
export const PLUGIN_VERSION = '1.0.0-rc.2';
