---
description: Claim files you are about to change so the other session is warned
argument-hint: [paths or globs, optional]
allowed-tools: mcp__collab__collab_claim, mcp__collab__collab_claims, mcp__collab__collab_release
---

Claim the paths we are about to work on with `collab_claim`.

If $ARGUMENTS names paths or globs, claim those. Otherwise infer them from what we are working on
and tell me what you claimed. Add a short `note` saying what we are doing to them.

First call `collab_claims` — if the peer already claimed something that overlaps, do not claim it.
Tell me about the conflict instead so we can sort it out on the channel.
