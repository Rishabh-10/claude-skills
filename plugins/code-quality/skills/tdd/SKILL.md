---
name: tdd
description: Build a feature test-first under a strict red-green-refactor loop, where every test is watched failing before the code that satisfies it is written. Use when the user asks for TDD, or for well-specified logic where the behavior is known up front.
argument-hint: "[the behavior to build]"
disable-model-invocation: true
---

# Test-driven development

Building: **$ARGUMENTS**

The discipline is not "write tests early". It is: **no production code is written except to
make a failing test pass.** The value comes entirely from the order, so the order is not
negotiable.

If you write the implementation first and the test after, you have written a test that
passes. You have not learned whether it can fail — and a test that cannot fail is worse
than no test, because it looks like coverage.

## Setup

Before the first cycle, find and confirm the test command from `package.json`, `Makefile`,
`pyproject.toml`, `justfile`, or CI config. Read the existing test suite and match its
framework, layout, naming, and fixture style.

Prefer a watch mode if the project has one. The loop below runs many times, and a slow
feedback cycle is what makes people abandon TDD.

## The loop

### RED — write one failing test

Write **one** test for the smallest piece of behavior not yet implemented. Not a file of
tests. One.

Run it. **Watch it fail.** Then check the failure message: it must fail for the reason you
expect. A test that fails with `ModuleNotFoundError` when you expected a wrong return value
is not red for the right reason — fix the test before continuing.

This step is the entire point. Skipping the observation of failure removes the only
evidence that the test tests anything.

### GREEN — make it pass, minimally

Write the least code that turns the test green. Hardcoding a return value is legitimate
here; the next test will force the generalisation. Resist implementing what you can already
see is coming — that is the design pressure doing its job, and skipping ahead loses it.

Run the test. Confirm it passes. Run the whole suite and confirm nothing else broke.

### REFACTOR — clean up under green

Now, with the suite green, improve the code you just wrote: extract, rename, remove
duplication. Run the tests after each change.

Refactor the *tests* here too. Test code is read more often than production code and rots
just as fast.

Change no behavior in this step. If a test goes red during refactoring, you changed
behavior — revert and try again in smaller steps.

### Repeat

Next smallest behavior. Aim for cycles measured in minutes. If a cycle is taking long, the
step was too big — back it out and take a smaller one.

## Choosing the next test

Work from the outside in, in roughly this order:

1. The simplest possible case — usually degenerate: empty, zero, one.
2. The typical case.
3. The boundary cases the typical case revealed.
4. The failure paths: invalid input, dependency unavailable, timeout.
5. The awkward case you have been avoiding. It is where the design flaw lives.

## Rules

- **Never write production code without a red test demanding it.** If you catch yourself
  adding an untested branch "while you are here", delete it and write the test first.
- **One reason to fail per test.** If a test could go red for two different causes, split it.
- **Never modify a test to make it pass.** In TDD the test is the specification; changing it
  to fit the code inverts the entire method. Change it only when the requirement changed,
  and say so.
- **Do not mock what you are testing.** Mock boundaries you do not own — network, clock,
  filesystem, randomness. A test built from mocks of your own code tests the mocks.
- **Commit at green**, never at red. Each commit should be a working state.

## When not to use this

TDD earns its cost on logic with definable behavior — parsing, calculation, state machines,
validation, business rules. It is a poor fit for exploratory work where you do not yet know
what correct looks like, for UI layout, and for thin glue with no logic in it.

If the shape is genuinely unknown, spike it untested, learn what you needed to learn, then
**throw the spike away** and rebuild it test-first. Keeping the spike is how untested code
enters a TDD codebase.

## Report

- The cycles completed, as a short list of behaviors driven out.
- The final suite output, pasted as printed.
- Confirmation that each test was observed failing before its implementation existed — and
  flag honestly any that were not.
- What is still untested and why.
