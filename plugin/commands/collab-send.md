---
description: Send a message to a topic, a person, or a person in a topic
argument-hint: [who, and what to tell them]
allowed-tools: mcp__collab__collab_send, mcp__collab__collab_status
---

Send this with `collab_send`: $ARGUMENTS

Address it:
- `replyTo`: the number of a message this session got, to answer exactly the session that wrote it;
- `topic`: everyone else working in a topic, usually this session's own;
- `user`: one person, by handle: in this topic when they are in it, otherwise all of their sessions
  (`anyTopic: true` reaches all of them on purpose);
- both: that person's sessions in that topic;
- `session`: just one of a person's sessions, by the full id `collab_status` or their message shows.
  Use it when they have several sessions open.

If this answers a message, use `replyTo`. If I named a person or a topic, use it. Otherwise send it
to this session's topic. If you don't know the handles or topics, check `collab_status` first.

Write it so the reader can act without a follow-up question. They cannot see this session, so
include the specifics: file paths, endpoint names, error text. Use `type: "question"` if it expects
an answer. Keep `urgency` at `normal` unless they genuinely need to stop what they are doing.

Then confirm to me in one line what was sent.
