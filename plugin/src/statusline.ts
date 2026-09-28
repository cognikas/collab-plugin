/**
 * One line for Claude Code's status line, from your own status line script:
 *
 *   collab ● carlos rc5#2 40% · 2 unread
 *
 * Claude Code runs a status line command on every refresh, with the session as
 * JSON on stdin. This reads only what the session's daemon keeps on disk: no
 * network and no protocol runtime, so it is its own small bundle rather than a
 * command of cli.mjs. Prints nothing when the session is not on the channel.
 */
import fs from 'node:fs';
import path from 'node:path';
import { installedDataRoots } from './lib/config.js';
import { renderStatusLine } from './lib/render.js';
import { readLocalState, unreadMessages } from './lib/state.js';

async function readStdin(): Promise<{ session_id?: unknown }> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as { session_id?: unknown };
  } catch {
    return {};
  }
}

/**
 * A status line script runs outside the plugin, so CLAUDE_PLUGIN_DATA is not
 * set, or is another plugin's. The plugin's data sits under
 * ~/.claude/plugins/data/collab-channel-<marketplace>; the one that holds this
 * session is the one to read.
 */
function dataRootFor(clientSessionId: string): string | undefined {
  const candidates = [process.env.CLAUDE_PLUGIN_DATA, ...installedDataRoots()].filter((dir): dir is string => Boolean(dir));
  return candidates.find((dir) => fs.existsSync(path.join(dir, 'v1', 'sessions', clientSessionId, 'state.json')));
}

async function main(): Promise<void> {
  const { session_id: id } = await readStdin();
  if (typeof id !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(id)) return;
  const root = dataRootFor(id);
  if (!root) return;
  process.env.CLAUDE_PLUGIN_DATA = root;
  const line = renderStatusLine(readLocalState(id), unreadMessages(id).length, id);
  if (line) process.stdout.write(`${line}\n`);
}

// A status line that fails prints nothing rather than an error across the terminal.
main().catch(() => undefined);
