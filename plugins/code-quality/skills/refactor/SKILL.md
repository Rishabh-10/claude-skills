---
name: refactor
description: Restructure existing code without changing its behavior — extract, rename, deduplicate, simplify — with tests as the safety net at every step. Use when asked to clean up, simplify, or reorganise code that already works.
argument-hint: "[file, module, or smell to address]"
disable-model-invocation: true
---

# Refactor

Target: **$ARGUMENTS**

**Refactoring changes structure, never behavior.** If the observable output changes, it is not a refactor — it is a rewrite, and it needs a plan and a review, not this skill.

## Preconditions

Do not start until all three hold:

1. **Tests exist and pass now.** Run them and record the result. Without a green baseline you cannot tell a refactor from a regression. If there are no tests, write characterisation tests *first* — tests that pin down what the code currently does, bugs included.
2. **The working tree is clean**, or its existing changes are unrelated and known. A refactor tangled with a feature change is unreviewable.
3. **There is a real reason.** Name the concrete problem: this logic is duplicated in four places; this function has six responsibilities; this name lies about what it does. "Cleaner" is not a reason. If you cannot name the problem, stop — churn without a defect is a cost with no benefit.

## Method

Work in small, individually reversible steps. After **each** step, run the tests. Never batch five changes and run once — when it breaks you will not know which one did it.

Ordered by risk, lowest first:

1. **Rename** to what the thing actually is. Use the language tooling where available; verify no string-based references (config keys, serialized names, reflection, API fields) were silently broken.
2. **Extract** a well-named function or constant from a block that needed a comment to explain it. The comment becomes the name.
3. **Inline** an indirection that adds nothing — a single-caller wrapper, an alias, a one-line pass-through.
4. **Deduplicate**, but only genuine duplication. Two pieces of code that look alike and change for different reasons must stay separate; merging them creates a coupling that will hurt later.
5. **Reduce nesting** with early returns and guard clauses.
6. **Narrow scope** — shrink variable lifetimes, tighten visibility, remove unused parameters and dead branches.
7. **Move** code across module boundaries. Highest risk: do it last, alone, and re-run the full suite.

## Hard limits

- **No behavior change.** Not even a "clearly better" error message, a fixed edge case, or a corrected default. Bugs you find get reported, not fixed here — fixing them silently inside a refactor makes both changes unreviewable.
- **No scope creep.** Stay inside the named target. Adjacent code that also looks bad goes in the report.
- **No new dependencies**, no framework migration, no formatting sweeps of untouched files.
- **No abstraction for a hypothetical second caller.**

## Verify

- Full test suite green — same tests, same count as the baseline. A test that had to change is a red flag: explain exactly why the change was legitimate.
- Type checker and linter clean.
- `git diff --stat` roughly matches what you intended. A refactor that touched thirty unexpected files did something you did not intend.

## Report

- **Problem** — the concrete defect in the old structure.
- **Steps taken** — the sequence, each one named.
- **Proof of equivalence** — the test result before and after, as printed.
- **Bugs found but not fixed** — with `file:line`, for separate follow-up.
- **Left alone** — adjacent problems deliberately out of scope.
