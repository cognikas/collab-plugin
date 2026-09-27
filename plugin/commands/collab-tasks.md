---
description: Show the open tasks of this topic's shared task lists, or add tasks to one
argument-hint: [list key and tasks to add, optional]
allowed-tools: mcp__collab__collab_tasks, mcp__collab__collab_task_add, mcp__collab__collab_task_update
---

If $ARGUMENTS is empty, call `collab_tasks` and report it to me compactly: each list with its
counts, then its open tasks. For each task, say who has it and how far along it is. Point out any
task that overlaps what we are working on right now, and any that looks abandoned (in progress,
no update for hours).

If $ARGUMENTS names a list and tasks, add them with `collab_task_add`: one task per item, each a
short line that says what to do. Tell me the numbers they got. If the list is new, say so, in case
I mistyped its key.

Do not check out, finish or dismiss anything unless I ask for it.
