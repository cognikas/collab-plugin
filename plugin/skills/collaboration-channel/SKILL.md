---
name: collaboration-channel
description: Use when another developer is working on the same project in their own Claude Code session and you need to coordinate with them — sending or answering messages, announcing finished work, sharing context instead of pasting it, or claiming files before a refactor. Also use when you are blocked waiting on something they are building.
---

# Working alongside another session

Other developers run their own Claude Code sessions, on other machines. The `collab_*` tools are
a live channel to them. Everything you publish reaches their sessions automatically. They do not
have to ask for it, and you do not have to write a handoff document for a person to carry across.

They cannot see your session. They know only what you send.

## Topics and who a message is for

This session works in a **topic**, usually the repository's name. It receives only what is
addressed to that topic or to its user. Claims and shared context belong to the topic too.
`collab_status` shows your handle and topic, and which topics each member is in.

Every `collab_send` and `collab_done` says who it is for. There is no channel-wide broadcast:

- `topic: "<topic>"`: everyone else working in that topic. This is the usual choice for your own
  topic.
- `user: "<handle>"`: every session of that member, whatever topic they are in. Use it for
  something personal to them, or when you don't know where they are.
- both: only that member's sessions in that topic.
- `session: "<id>"`, with or without `user`: just that one session. A member can have several
  sessions open, even in the same topic; `collab_status` lists each one with its full id. It must
  be connected right now.

Each message you receive shows who sent it as `handle@topic (session <id>)`. A reply to `user`
reaches that person; add `session` to reach only the session that wrote to you.

## When to reach for the channel

**Announce finished work with `collab_done`, not a plain note.** The moment you complete something
another person could be waiting on (an endpoint, a migration, a shared type, a fixed build), say so
to whoever depends on it. Include what is now available and what they can start on. This is the
single highest-value thing the channel does; it is what replaces the handoff.

**Publish context with `collab_context_put` instead of repeating yourself.** When you work out
something durable (a design decision, an API contract, why an approach was rejected, a summary of
a module you just read), store it under a stable key in your topic. Others read it with
`collab_context_get` instead of re-deriving it or asking you to paste it. From another topic they
pass `topic`. Keys are cheap: use `auth-design`, `db-schema`, `deploy-runbook`. Writing an existing
key adds a version, so nothing is lost.

**Check `collab_context_list` before a deep investigation.** If someone in your topic already
studied the module you are about to read, their notes are there. Reading them first is faster, and
keeps you consistent with decisions already made.

**Claim paths with `collab_claim` before a refactor that spans more than a file or two.** Others in
your topic are warned before editing anything you claimed. That is what stops two sessions from
quietly rewriting the same code. Release with `collab_release` when you are done. Claims expire on
their own, so a forgotten one is not a disaster, but releasing promptly keeps the warnings
meaningful.

**Use `collab_wait` only when you are genuinely blocked.** It blocks your turn until a message for
this session arrives. It is right for "I cannot integrate until their endpoint exists". It is wrong
as a polling loop, and wrong when you could be doing other useful work first: do that work, then
wait.

**Ask with `collab_send` and `type: "question"`** when the answer changes what you build and you
cannot reasonably guess. Say what you will do if they do not answer, so they can stay silent when
you guessed right.

## Urgency

`urgency: "high"` interrupts the peer's turn. Use it when they should stop what they are doing:
you broke the build they depend on, or they are about to duplicate work you just finished.
Everything else is `normal`, and routine bookkeeping is `low`.

Being interrupted is expensive. A message that could have waited for their next turn should not be
`high`.

## What a good message looks like

Bad: "done with the login stuff"

Good: `collab_done` with task "POST /v1/login returns a session cookie", summary "Rotates the
refresh token on every call; the client must send credentials: 'include'. Error shape is
{code, message}, 401 on bad credentials.", artifacts ["src/api/login.ts", "docs/auth.md"].

The difference is whether the peer can act without asking you a follow-up question.

## Reading the room

`collab_status` tells you who is online and in which topics, what has been claimed in yours, and
how much you have not read. Check it before you start something substantial: someone may already be
in that code.

If the channel is disconnected, the tools say so and fall back to cached state. Say so plainly
rather than pretending the peer received something.
