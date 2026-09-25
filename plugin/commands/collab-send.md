---
description: Send a message to a topic, a person, or a person in a topic
argument-hint: [who, and what to tell them]
allowed-tools: mcp__collab__collab_send, mcp__collab__collab_status
---

Send this with `collab_send`: $ARGUMENTS

Address it:
- `topic`: everyone else working in a topic, usually this session's own;
- `user`: one person, by handle, in any topic;
- both: that person's sessions in that topic.

If I named a person or a topic, use it. Otherwise send it to this session's topic. If you don't know
the handles or topics, check `collab_status` first.

Write it so the reader can act without a follow-up question. They cannot see this session, so
include the specifics: file paths, endpoint names, error text. Use `type: "question"` if it expects
an answer. Keep `urgency` at `normal` unless they genuinely need to stop what they are doing.

Then confirm to me in one line what was sent.
