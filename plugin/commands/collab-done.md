---
description: Announce finished work to whoever depends on it, the replacement for a handoff
argument-hint: [what you finished, optional]
allowed-tools: mcp__collab__collab_done, mcp__collab__collab_claims, mcp__collab__collab_release
---

Announce completed work on the channel with `collab_done`.

If $ARGUMENTS describes what was finished, use it. Otherwise work it out from what we did in this
session so far.

Include:
- `task`: one line naming what is now done
- `summary`: what the reader needs to know to build on it: contracts, gotchas, anything that
  changes their assumptions
- `artifacts`: the files, endpoints, branches or PRs produced
- who it is for: `topic` for everyone working in that topic (by default this session's own), `user`
  for one person in any topic, or both; add `session` for just one of that person's sessions

Then check `collab_claims`: if I hold claims covering work that is now finished, release them.
