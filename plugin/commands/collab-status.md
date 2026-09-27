---
description: Show who is on the collaboration channel and in which topic, what is claimed, and what you have not read
allowed-tools: mcp__collab__collab_status, mcp__collab__collab_inbox
---

Call `collab_status` and report the result to me compactly:

- whether the channel is connected, and this session's handle and topic
- my other sessions, if there are any
- who else is online, and in which topics; for someone with several sessions, how many and where
  each one is
- active claims in this topic, and whether any overlap what we are currently working on
- task lists with open tasks in this topic, if any
- how many messages are unread

If there are unread messages, also call `collab_inbox` and summarize them. Point out anything that
changes what we should do next; stay quiet about the rest.
