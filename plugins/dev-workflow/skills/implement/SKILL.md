---
name: implement
description: Execute an agreed plan or a well-specified change end to end — write the code, keep it consistent with the surrounding style, verify it, and report honestly on what was and was not done. Use after /plan, or when the user hands over a clear specification to build.
argument-hint: "[plan, issue, or description]"
disable-model-invocation: true
---

# Implement

Build: **$ARGUMENTS**

## Order of work

1. **Confirm the target.** If a plan exists, follow it. If not, and the change touches more than two files or has an unresolved design choice, run `/dev-workflow:plan` first rather than improvising.
2. **Read the neighbors before writing.** Open the files adjacent to each change — the sibling module, the existing test file, the nearest similar feature. Your code should be indistinguishable in style from what is already there.
3. **Work in vertical slices.** One coherent piece at a time: change, verify, move on. Do not leave the repo in a state that does not compile between slices if you can avoid it.
4. **Write the test with the code, not after.** For a bug fix, write the failing test first and watch it fail — a test that passes before the fix proves nothing.
5. **Verify with the project's own commands.** Find them in `package.json` scripts, `Makefile`, `pyproject.toml`, `justfile`, or CI config. Run the type checker, the linter, and the tests that cover what you touched. Do not invent commands.

## Matching the codebase

Write code that reads like the code around it:

- Same error-handling idiom. If the module returns result objects, do not start throwing.
- Same import style, same naming, same file organisation.
- Same comment density. If the file has no comments, do not add a running narration; comment only what is genuinely non-obvious, and explain *why*, never *what*.
- Reuse what exists. Before adding a helper, grep for one. Duplicating an existing utility is a defect.

## Boundaries

- Implement what was asked. Do not widen scope, refactor unrelated code, upgrade dependencies, or reformat untouched files.
- Do not add abstraction for a second use case that does not exist yet.
- Do not delete or rewrite tests to make a change pass. If a test now fails legitimately, that is a finding to report, not an obstacle to remove.
- Do not commit or push unless asked.

## Handling a blocker

If something in the plan turns out to be wrong or impossible:

1. Finish every part that does not depend on the blocker.
2. State plainly what is blocked and why, with the evidence.
3. Propose the smallest change to the plan that unblocks it.

Do not silently substitute a different design. Do not stub something out and describe it as done.

## Report

End with:

- **Done** — what now works, and the command output that proves it.
- **Verification** — the exact commands run and their result. If tests failed, paste the failure. Never describe unverified work as verified.
- **Left out** — anything deferred, stubbed, or out of scope, and why.
- **Follow-ups** — problems noticed but deliberately not fixed.
