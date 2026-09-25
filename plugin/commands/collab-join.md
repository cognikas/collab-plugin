---
description: Join the collaboration channel, or diagnose why it is not connected
allowed-tools: Bash(node:*)
---

Run the plugin CLI to get this session onto the channel:

```
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.mjs" doctor
```

Read the diagnostics and act on them:

- If credentials are missing and an invite code is configured, run
  `node "${CLAUDE_PLUGIN_ROOT}/dist/cli.mjs" join`.
- If `api_endpoint`, `display_name` or `invite_code` is not set, tell me exactly which fields to
  fill in `/config` under the Collaboration Channel plugin. Do not guess values.
- If the daemon is running but the socket is disconnected, show me the last log lines and say what
  they point at.

Finish with a one-line verdict: connected and on which channel, or what is still missing.
