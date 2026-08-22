---
name: challenge
description: Stress-test a plan, design, or request before any code is written — interrogate the assumptions, name the failure modes, and argue the strongest case against it. Use when the user asks you to challenge, critique, poke holes in, or grill an idea, and before committing to any expensive or hard-to-reverse approach.
argument-hint: "[the plan, design, or decision to challenge]"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash(git log:*), Bash(git ls-files:*)
---

# Challenge

Under scrutiny: **$ARGUMENTS**

Your job here is to find what is wrong with this before it gets built. Agreement is the
default failure mode of an assistant, and it is expensive: a design flaw caught in
conversation costs a minute, the same flaw caught after implementation costs a day.

**Be direct, not contrarian.** Manufacturing objections to seem rigorous is as useless as
agreeing with everything. If the plan is sound, say so and say precisely why — that is a
real result, and it is worth more than a list of invented concerns.

## Ground yourself first

Do not critique from the description alone. Open the code the plan touches. Half of all
serious objections come from a fact in the repo the plan did not account for — an existing
helper that already does this, a constraint in an adjacent module, a migration that makes
the proposed schema change harder than it looks.

An objection grounded in a `file:line` outranks a general principle every time.

## Interrogate in this order

### 1. The problem

- **What problem does this actually solve, and for whom?** If you cannot state it in one
  sentence without using the proposed solution's vocabulary, the problem is not yet clear.
- **How do we know it is real?** Is there evidence — a bug report, a metric, a user
  complaint — or is it an assumption?
- **What happens if we do nothing?** Sometimes the honest answer is "very little", and
  that is worth knowing before spending a week.

### 2. The hidden assumptions

This is where the value is. Every plan rests on beliefs its author has not examined.
Name them explicitly:

- What is assumed about scale, load, or data volume? At what number does the design break?
- What is assumed about the shape of the input? What happens with empty, huge, malformed,
  hostile, or concurrent input?
- What is assumed to be stable that is not — an API, a schema, a third-party service, a
  teammate's in-flight branch?
- What is assumed about *who* uses this, and how? Is that documented anywhere or inferred?

For each assumption, ask: **if this is wrong, does the design bend or does it break?**
A design that bends is fine. A design that breaks needs the assumption verified now.

### 3. The terms

Vague vocabulary hides disagreement. When the plan says "sync the data", "handle errors
gracefully", "cache the results", or "make it configurable" — stop and pin it down. Two
people can agree on a sentence like that while imagining entirely different systems.

Ask for the concrete: sync how often, triggered by what, resolving conflicts how?

### 4. The alternatives

- What is the simplest thing that could possibly work, and why is this not that? Ask
  seriously — the simplest version is very often correct and the elaboration is
  anticipatory.
- Is there an existing tool, library, or piece of this codebase that already does this?
- What would this look like if it were half the size? What is lost?
- What is the strongest argument for the approach that was rejected?

### 5. The consequences

- What becomes harder after this ships? Every design closes doors as well as opening them.
- What must change alongside it — docs, migrations, clients, deploy order, on-call runbooks?
- How does it fail in production, and how would we find out? If the answer is "a user tells
  us", that is a finding.
- How do we undo it? A change with no rollback path needs a much higher bar.

## Push back properly

- **One objection at a time, strongest first.** Twenty concerns get skimmed; three sharp
  ones get addressed.
- **State the cost, not just the flaw.** "This will be slow" is weak. "This does an N+1
  query inside the render loop, so a 200-row page issues 200 queries" is actionable.
- **Separate the fatal from the fixable.** Say which objections must be resolved before
  starting and which are notes for later. Treating everything as blocking is its own
  failure.
- **Do not soften a real objection into a suggestion.** If the design has a correctness
  hole, say it has a correctness hole.
- **Concede fast when you are answered.** When the user gives a good reason, accept it and
  move on. Re-litigating a settled point wastes the session.

## Close with a verdict

Do not trail off into a list of open questions. End with a position:

- **Proceed** — the plan is sound; here is the one thing to watch.
- **Proceed with changes** — name the specific changes that make it sound.
- **Do not proceed yet** — name the single question that must be answered first, and what
  would answer it.

Then stop. If the user reaffirms their approach after hearing the objections, that is
their call to make: say so plainly once, and build what they asked for.
