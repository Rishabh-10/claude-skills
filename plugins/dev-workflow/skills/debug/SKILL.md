---
name: debug
description: Find the root cause of a bug, test failure, crash, or unexpected behavior using hypothesis-driven investigation rather than speculative edits. Use whenever something is broken and the cause is not yet known, or when a fix attempt has already failed once.
argument-hint: "[symptom, error message, or failing test]"
---

# Debug

Symptom: **$ARGUMENTS**

The goal is the *root cause*, not a change that makes the symptom go away. A fix you cannot explain is not a fix.

## The loop

### 1. Reproduce

Get a deterministic, minimal reproduction before changing anything.

- Run the failing test or command yourself and read the **full** output — stack trace, exit code, stderr, not just the last line.
- If it is intermittent, note what varies: ordering, timing, environment, data.
- If you cannot reproduce it, say so and ask for the exact steps. Do not fix code based on a symptom you have never seen.

### 2. Locate

Read the stack trace bottom-up to the first frame inside project code — that is where to start, not the library frame at the top. Then:

```
git log -S"<the suspicious symbol>" --oneline -10
git log --oneline -10 -- <the file>
```

If this worked before, the diff that broke it usually still exists in history.

### 3. Hypothesise — one at a time

State the hypothesis explicitly before testing it:

> "`parseConfig` receives `undefined` because the caller reads `opts.path` before defaults are merged."

A good hypothesis is falsifiable and names a specific mechanism. "Something is wrong with the config" is not a hypothesis.

### 4. Test the hypothesis cheaply

Prefer evidence over edits: read the code path, add a temporary log line, inspect the actual value, run a narrower test. Confirm or kill the hypothesis before forming the next one.

**Change exactly one thing per experiment.** Two simultaneous changes tell you nothing about which one mattered.

### 5. Confirm the cause

You have the root cause only when you can state the full chain: *this input* → *this code path* → *this wrong state* → *this observed symptom*. Verify by predicting a second, different symptom the same cause would produce, then checking for it.

### 6. Fix at the right level

Fix the cause, not the symptom. Ask where the invariant was actually broken — a `null` check at the crash site is usually a bandage over a producer that should never have emitted `null`.

Then:

- Add a regression test that fails before the fix and passes after. Verify both directions.
- Remove every temporary log line and debug artifact you added.
- Re-run the surrounding test suite, not just the one test.

## Anti-patterns

- Changing code hoping the symptom moves. If you cannot say what a change will prove, do not make it.
- Widening a `try/catch`, loosening a type, or adding a retry to silence an error whose cause you have not found.
- Declaring victory on a flaky test that passed once. Run it repeatedly.
- Blaming the framework, the compiler, or the library before eliminating your own code. It is almost never the library.

## Report

- **Root cause** — the mechanism, in one or two sentences, with `file:line`.
- **Why it surfaced now** — the commit, input, or condition that triggered it, if identifiable.
- **The fix** — what changed and why it is at the right level.
- **Proof** — the test that fails before and passes after, with the actual command output.
- **Related risk** — other places with the same latent bug, if you found any.
