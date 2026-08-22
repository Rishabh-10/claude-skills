---
name: review
description: Review a diff, branch, or set of files for correctness bugs, missing tests, and unnecessary complexity, ranked by severity with concrete failure scenarios. Use before opening a PR, when asked to review changes, or after finishing a feature.
argument-hint: "[optional target - branch, PR number, or path]"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git log:*), Bash(git status:*), Bash(git merge-base:*), Bash(gh pr:*)
---

# Review

Target: **$ARGUMENTS** (default: working tree changes plus this branch's commits against its merge base)

## Establish the diff

```!
git status --short
git diff --stat
```

For branch review, diff against the merge base, never against the tip of main:

```
git diff $(git merge-base HEAD main)...HEAD
```

Read the **full** diff plus enough surrounding context to judge it. A hunk in isolation hides most real bugs — open the file when the change interacts with anything outside the visible lines.

## What to look for, in priority order

### 1. Correctness — does it do the wrong thing?

- Boundary conditions: empty, single element, maximum, zero, negative, exactly-at-limit.
- `null`/`undefined`/`None` reaching code that assumes a value.
- Off-by-one in indexing, slicing, pagination, ranges.
- Error paths: swallowed exceptions, errors logged and then execution continuing as if fine, `catch` blocks that lose the original error.
- Concurrency: shared mutable state, non-atomic read-modify-write, `await` inside a loop that was meant to be parallel, unhandled promise rejection.
- Resource lifecycle: files, connections, locks, subscriptions, timers not released on the error path.
- Behavior changes not reflected in tests, and tests changed to accommodate a bug rather than catch it.

### 2. Security — only where the diff touches it

Untrusted input reaching a query, a shell, a path, a template, or a deserializer. Authz checks on the new route. Secrets or tokens in code, logs, or error messages. Do not run a full audit here — that is `/code-quality:security-audit`.

### 3. Test coverage

Does a test exist that would have failed before this change? For a bug fix, that is mandatory. Are the failure paths tested, or only the happy path? Are there assertions that cannot fail?

### 4. Simplification and reuse

- Code that duplicates an existing helper — grep before claiming it is new.
- Abstraction introduced for a single caller.
- Dead branches, unused parameters, leftover debug output.
- A simpler formulation that is unambiguously equivalent.

## Verification bar

Before reporting anything, try to disprove it. For each candidate finding, construct the concrete input and state that reaches the failure. If you cannot, either mark it clearly as uncertain or drop it.

**A false positive costs more than a missed nit.** Reviewers who cry wolf get ignored.

## Report

Ranked most severe first. For each finding:

- `path/file.ts:42` — one-sentence statement of the defect.
- **Failure scenario:** the specific input or state → the wrong result.
- **Fix:** the concrete change, in a line or two.

Then a short **Looks good** note on what you checked and found sound — it tells the author what was actually covered.

If nothing survives verification, say exactly that. Do not manufacture findings to look diligent.

## Delegating

For a large diff, dispatch `code-quality:code-reviewer` to review in parallel with your own read, then merge and de-duplicate the findings.
