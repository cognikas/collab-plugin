# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The Claude Code plugin `collab-channel` 1.0 (daemon, hooks, MCP server, commands, skill) and the
`cognikas` plugin marketplace that installs it. It is the client of the channel: it speaks protocol
`collab.v1` from `cognikas/collab-protocol` against `cognikas/collab-backend`. 0.6 (protocol 2) is
the historic repo `claude-code-collaboration` and is not compatible.

README, `docs/` and commit messages are in Spanish. Code comments are in English. Changes go through
feature branches merged into `main` by PR.

## Commands

Requirements: Node ≥ 20 and pnpm. `@collab/protocol` is a git dependency pinned to a tag of the
private `collab-protocol` repo, fetched over SSH; without a GitHub SSH key, rewrite SSH to HTTPS
(global git config, or per command with `GIT_CONFIG_COUNT`/`GIT_CONFIG_KEY_n`/`GIT_CONFIG_VALUE_n`).

```bash
pnpm install
pnpm build                                        # esbuild → plugin/dist/*.mjs (committed)
pnpm typecheck && pnpm test                       # tsc (src and tests) + vitest, no network
pnpm --filter @collab/plugin exec vitest run test/frames.test.ts
pnpm --filter @collab/plugin exec vitest run -t "<test name>"
node scripts/version.mjs <x.y.z[-pre]>
```

`test/stop-guard.test.ts` runs the built `plugin/dist/hook.mjs`, so build before testing.

Against a deployed 1.0 backend only (outward-facing: confirm with the user first):

```bash
COLLAB_API_ENDPOINT=<url> node scripts/mcp-check.mjs --invite <code>   # invite minted in collab-backend
node scripts/fake-peer.mjs join|send|watch|state …
```

## Releasing a plugin change

`plugin/dist/` is committed on purpose, so installing needs no toolchain, and `claude plugin update`
compares version numbers, not commits. Whenever `plugin/src/` changes:

1. `node scripts/version.mjs <x.y.z>`: updates the 5 places (`plugin.json`, the plugin entry in
   `.claude-plugin/marketplace.json`, both `package.json` files, `PLUGIN_VERSION` in
   `plugin/src/lib/version.ts`, which is the MCP serverInfo and the daemon's ClientInfo).
   `plugin/test/versions.test.ts` fails if they drift.
2. `pnpm build`
3. Commit the source, the new `dist/` and the version bump together.

Never hand-edit `plugin/dist/`. Leave the catalog's own top-level `version` in `marketplace.json` at
0.1.0. A wire change starts in `collab-protocol` (new tag); then bump the tag in both `package.json`
files and `pnpm install`.

## Architecture

- **Three parts, one plugin.** The daemon (`src/daemon.ts`) holds the WebSocket and writes state to
  `${CLAUDE_PLUGIN_DATA}/v1/sessions/<client_session_id>/`. Hooks (`src/hook.ts`) only read those
  files. The MCP server (`src/mcp-server.ts`) talks to its daemon over a token-protected loopback
  API and finds it by `process.ppid` (`COLLAB_CLAUDE_PID`).
- **Wire vs local model.** Only `src/lib/wire.ts`, `src/lib/frames.ts`, `src/lib/api.ts` and the
  daemon touch `@collab/protocol` wire types. Everything on disk and everything the hooks, the MCP
  tools and the CLI use is the plain model in `src/lib/model.ts` (ms numbers, lowercase enums), so
  the hook bundle never loads the protobuf runtime. Keep it that way.
- **WebSocket binding.** IssueTicket over HTTP → connect with `?ticket=` → first frame `subscribe`
  with ClientInfo → wait for `hello` before sending anything else → typed `result`/`error` by
  `requestId` → `heartbeat` every HEARTBEAT_SECONDS → reconnect with `since` = last seq.
  UNSUPPORTED_PROTOCOL and REVOKED are final: the daemon stops reconnecting and records `fatal`.
- **HTTP binding** carries every unary call: used when the socket is not subscribed, when a frame
  exceeds `WS_FRAME_LIMIT_BYTES` (API Gateway's 128 KB limit), and when the socket could not carry a
  request. A server answer (result or error) is never retried over HTTP.
- **Data under `v1/`.** 1.0 keeps 0.6's plugin id and so its CLAUDE_PLUGIN_DATA; the `v1/` folder
  keeps 0.6's credentials and inbox out. Stored credentials are only used against the
  `api_endpoint` that issued them.

## Invariants that are easy to break

- **`.mcp.json` must map every option explicitly** (`"CLAUDE_PLUGIN_OPTION_X": "${user_config.x}"`).
  Claude Code exports `CLAUDE_PLUGIN_OPTION_*` automatically to hooks only; an MCP server gets an
  option only through that mapping. The mapping makes a `--plugin-dir` load fail (no stored
  options), which is why `scripts/dev-plugin.mjs` builds a copy without it for side-by-side tests.
  Don't remove the mapping from the real `.mcp.json` to "fix" that.

- **Hooks never touch the network.** They read what the daemon left on disk. `Stop` delivers by
  exiting 2 with stderr; `PostToolUse` delivers urgent messages as `additionalContext`; `PreToolUse`
  on Edit/Write warns about claimed files.
- **Stop-hook loop guard:** the cursor is advanced *before* blocking, plus a 4 s rate limit.
  `test/stop-guard.test.ts` asserts two consecutive `Stop`s interrupt exactly once.
- **One high-water-mark cursor.** Urgency decides *whether* to interrupt, never *what* is shown:
  every interruption delivers all unread messages up to the seq it acks.
- **Peer text is untrusted input to the model.** Everything rendered is prefixed with
  `UNTRUSTED_NOTE` and flattened with `flattenForContext` (newlines, Unicode separators, controls,
  bidi overrides); channel events also neutralize `<channel`. Regression tests cover this.
- **Topic resolution** happens once, when the daemon starts, and stays fixed for that daemon:
  `COLLAB_TOPIC`, then the `topic` option, then the topic saved in `state.json`, then the git repo
  name, then `general`. An explicit topic beats the saved one, so it takes effect on the next start
  (`--resume` included); the saved one beats the repo name, so a restarted daemon does not wander.
- **Channel mode** pushes only into an idle session, claims the cursor before pushing, and gives the
  messages back to the hooks unless the turn the push should start shows up (confirm-or-requeue).
  That only holds until one push is confirmed: from then on the channel is known to be registered in
  that process, and no push is ever given back (`settlePush`), since that only delivers it twice.
  Before the first confirmation, only a turn that ended counts as idle (`isIdle` without
  `trustStale`).
- **A daemon must not outlive its session**, and SessionEnd alone cannot ensure it: it has 1.5 s,
  and the Claude Code process can live on as a `claude bg-spare`. So `SessionStart` retires the
  daemons its process left behind and this session's own from an earlier process
  (`daemonsToRetire`), and the watchdog exits when the process became a spare or has had no MCP
  server of ours for 3 minutes (`v1/mcp/`). `clearDaemonInfo` only removes the caller's own
  registration.
- **Task lists** are read with `ListTasks` over HTTP only, and written like any request. `state.json`
  keeps only the topic's lists with open tasks, from hello, from TASK notices (their payload carries
  the list's counts) and from this session's own results, since a session gets no notice of its own
  change (`applyTaskList`, which never rolls a list back).
- **Compaction** runs SessionStart again with `source: "compact"`, which is where the channel summary
  goes back in. PostCompact output cannot carry context, so it is not registered.
- `flattenForContext` in `src/lib/state.ts` and the tests hold escape sequences for invisible
  characters; edit those lines with care, or build such characters from code points.
