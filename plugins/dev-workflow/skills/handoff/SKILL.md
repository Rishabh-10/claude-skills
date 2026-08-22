---
name: handoff
description: Write a durable handoff note capturing the current state of work — what is done, what is in flight, what was learned, and the exact next step — so a future session or another engineer can resume without re-deriving context. Use before ending a long session, switching branches, or passing work to someone else.
argument-hint: "[optional output path, defaults to .claude/handoff.md]"
disable-model-invocation: true
allowed-tools: Read, Write, Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*)
---

# Handoff

Capture the state of the current work so it can be resumed cold.

## Gather the facts first

```!
git branch --show-current
git status --short
git log --oneline -8
git diff --stat
```

Do not write the note from memory alone — reconcile what you remember against what the working tree actually shows. Uncommitted changes you forgot about are exactly what breaks a handoff.

## Write the note

Default path `.claude/handoff.md` unless `$ARGUMENTS` names another. Overwrite any existing note for the same task; stale handoffs are worse than none.

```markdown
# Handoff — <task name>
_<ISO date> · branch `<branch>` · base `<merge-base branch>`_

## Goal
One sentence: what this work is meant to achieve.

## State
- [x] Done and verified — <what proves it>
- [~] In progress — <exactly where it stopped, which file, which function>
- [ ] Not started

## Working tree
Uncommitted changes and what each is for. Anything intentionally left dirty,
plus anything that must NOT be committed (debug logs, local config).

## Key decisions
Choices already made and the reason, so they are not relitigated.
Include options rejected and why.

## What was learned
Non-obvious facts discovered about this codebase during the work — the kind
of thing that cost half an hour to find. This is the highest-value section.

## Next step
The single concrete action to take on resuming — a command to run or a
specific edit, not "continue the feature".

## Blockers / open questions
What is unresolved and who or what can resolve it.
```

## Rules

- Be specific to the point of bluntness: `src/auth/session.ts:118`, not "the session code".
- Record failures as loudly as successes. An approach that did not work saves the next person the same dead end.
- Never claim something is done that you have not verified. Mark it `[~]` and say what verification is missing.
- Include the exact commands for build, test, and run — the reader should not have to hunt for them again.
- Keep it under a page. A handoff nobody reads is a handoff that failed.

After writing, tell the user the path and summarise the **Next step** line in your reply.
