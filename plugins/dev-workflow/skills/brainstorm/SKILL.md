---
name: brainstorm
description: Work out what to build before deciding how — clarify the real goal through questioning, generate genuinely different approaches, then narrow to one. Use when the problem is still fuzzy, when the user says "I'm thinking about", or when jumping straight to a plan would design the wrong thing well.
argument-hint: "[the rough idea or problem]"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash(git log:*), Bash(git ls-files:*)
---

# Brainstorm

Starting point: **$ARGUMENTS**

`/plan` answers *how*. This answers *what and why*, and it comes first when the answer is
not already obvious. The most expensive mistake in software is building the wrong thing
competently, and it is almost always avoidable with fifteen minutes of questions.

**Do not write code during this skill, and do not produce a plan.** The output is a
decision about what to build.

## 1. Find the real goal

The stated request is usually a proposed solution wearing the costume of a requirement.
"Add a CSV export" is a solution; the goal underneath might be "finance needs monthly
numbers without asking us" — which a scheduled email would serve better.

Work backwards:

- Who has this problem, and what do they do today instead?
- What does success look like concretely — what changes for them?
- What triggered this now? A new requirement, a recurring complaint, a near-miss?
- Is there a smaller problem inside this one that carries most of the value?

Ask these one or two at a time and actually wait for answers. A list of eight questions
gets a list of eight short answers; two questions get a conversation.

## 2. Ground it in the codebase

Before generating options, find out what already exists. Search for adjacent features, an
abandoned earlier attempt, a helper that solves half of it. Options invented in ignorance
of the repo get discarded the moment someone opens the code.

## 3. Generate options that actually differ

Produce **three** approaches that differ in kind, not in detail. Two variations on the same
idea plus a strawman is not a choice.

Force the range by anchoring on the extremes:

- **The minimum** — the smallest thing that delivers real value. Often a manual process, a
  config change, or fifty lines. Take this one seriously; it wins more often than it looks.
- **The obvious** — what a competent engineer would do by default here.
- **The different** — buy instead of build, change the requirement instead of the code,
  solve it one layer up, or delete the feature that created the need.

For each: what it is in three sentences, what it costs, what it buys, and what it forecloses.

## 4. Narrow

Compare them against what the user said matters, not against general engineering virtue.
Speed to ship, maintenance burden, reversibility, and blast radius usually decide it.

Ask directly about the tradeoff that actually splits the options: *"These differ mainly in
whether we accept stale data for up to an hour. Is that acceptable?"* One well-aimed
question resolves more than a comparison table.

Use `AskUserQuestion` when the choice is genuinely the user's — a product tradeoff, a
cost ceiling, a compatibility commitment. Do not use it for engineering decisions you are
equipped to make.

## 5. Land it

Close with a recommendation, not a menu. You have done the thinking; hand over the
conclusion:

- **Recommendation** — which option, in one sentence.
- **Why** — the specific reason it beats the runner-up here.
- **What we are accepting** — the real cost of this choice, stated plainly.
- **What would change the answer** — the fact that, if different, would flip it.
- **Still unresolved** — anything that must be settled before planning starts.

Then offer to run `/dev-workflow:plan` on the chosen option, or
`/dev-workflow:challenge` if the user wants it stress-tested first.

## Failure modes

- **Producing a plan instead of a decision.** If you are naming files, you have skipped
  ahead.
- **Three options that are one option.** Different libraries for the same design is not a
  set of alternatives.
- **Refusing to recommend.** A neutral summary of tradeoffs moves the work back to the
  user, which is the opposite of the job.
- **Interviewing past the point of usefulness.** When you can state the goal and the
  constraints, stop asking and start proposing.
