---
name: plan
description: Turn a feature request or bug report into a reviewable implementation plan — scope, file-by-file changes, test strategy, and risks — before any code is written. Use for multi-file changes, anything with more than one reasonable approach, or when the user asks for a plan or design.
argument-hint: "[what to build]"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash(git log:*), Bash(git ls-files:*)
---

# Plan

Produce a plan for: **$ARGUMENTS**

A plan is a document someone else could hand to a second engineer. If it only makes sense to you, it is notes, not a plan.

## Before writing anything

1. **Read the actual code.** Never plan against an imagined structure. Locate every file the change will touch and open it. If the area is unfamiliar, run `/dev-workflow:explore` first.
2. **Restate the goal in one sentence** — the observable outcome, not the mechanism. If you cannot, the requirement is unclear; ask before continuing.
3. **Find the existing pattern.** Almost every change has a sibling already in the repo. Find how the last similar thing was done and default to matching it. Deviating is allowed; deviating silently is not.

## Resolve the fork in the road

If more than one approach is genuinely reasonable, do not survey all of them in the plan. Pick one, state why in a sentence, and note what would change your mind. Use `AskUserQuestion` only when the choice materially changes the work *and* you cannot resolve it from the code — for example a storage engine, a public API shape, or a breaking-change decision. Never ask about things a careful engineer would just decide.

## Plan structure

```markdown
## Goal
One sentence: what is true after this ships that is not true now.

## Approach
2–4 sentences. The chosen design and the one-line reason it beats the alternative.

## Changes
- `path/to/file.ts` — what changes here and why (1 line)
- `path/to/other.py` — ...
(new files marked NEW; deletions marked DELETE)

## Test strategy
What proves this works. Name the specific cases, including the failure paths
and the boundary conditions — not "add unit tests".

## Risks and rollout
What could break, what is not covered, whether anything needs a migration,
a flag, or a coordinated deploy.

## Out of scope
What a reader might reasonably expect here that this deliberately does not do.
```

## Quality bar

Reject your own plan if any of these are true:

- A step says "update the logic" or "handle errors" without naming the concrete behavior.
- The file list is a guess rather than the result of reading.
- Test strategy is generic enough to paste into any other plan.
- It silently expands scope past what was asked. Extra work belongs under **Out of scope** with a note, not folded in.
- It cannot be executed without asking you follow-up questions.

## Size

Match plan length to the change. A two-file bugfix gets six lines under **Changes** and no ceremony. A new subsystem gets the full structure. Padding a small plan to look rigorous wastes the reviewer's time.

## After approval

Hand the plan to `/dev-workflow:implement`, which executes it step by step and reports drift.
