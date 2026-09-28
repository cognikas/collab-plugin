---
description: Diagnose why this session is not on the collaboration channel
allowed-tools: Bash(node:*)
---

Run the plugin's diagnostics for this session:

```
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.mjs" doctor
```

Read the diagnostics and act on them:

- The plugin redeems the invite itself when a Claude Code session starts, with the settings from
  `/config`. Never run `cli.mjs join` from here: this command cannot see `/config`, and a join
  from here would spend the invite with guessed values.
- If credentials are missing, tell me to check that `api_endpoint`, `invite_code` and
  `display_name` are filled in `/config` under the Collaboration Channel plugin, and then to quit
  Claude Code completely and start it again. `/reload-plugins` is not enough: the plugin's server
  keeps the old settings until Claude Code restarts. Do not guess values.
- If the diagnostics say credentials are in another folder, tell me the exact move they print.
- If there is a last error or a refusal from the server, quote it and say what it points at: a
  spent or expired invite, a display name whose handle is taken, a wrong `api_endpoint`.
- If the daemon is running but the socket is disconnected, show me the last log lines and say what
  they point at.

Finish with a one-line verdict: connected and on which channel, or what is still missing.
