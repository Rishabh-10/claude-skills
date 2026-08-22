---
name: test
description: Write or strengthen tests for a module, function, or change — covering the failure paths and boundaries rather than restating the happy path. Use when asked to add tests, when coverage is thin, or after implementing a change that lacks them.
argument-hint: "[file, function, or feature to test]"
---

# Test

Target: **$ARGUMENTS**

## Before writing a single test

1. **Find the existing test suite and copy its shape.** Locate the sibling test file, read it, and match the framework, the naming convention, the fixture style, the assertion library, and the file layout. A test that does not look like its neighbors is a defect regardless of whether it passes.
2. **Find the run command** from `package.json`, `Makefile`, `pyproject.toml`, `justfile`, or CI config. You will need it, and inventing one wastes a cycle.
3. **Read the code under test properly** — every branch, every early return, every thrown error. You are testing behavior, not restating the implementation.

## What to test

Cover, in this order:

1. **The contract** — the documented behavior for valid input. One test, not five variations.
2. **Failure paths** — every way this can legitimately fail: invalid input, missing dependency, downstream error, timeout, permission denied. This is where real bugs live and where coverage is usually thin.
3. **Boundaries** — empty, one, many, maximum, zero, negative, off-by-one at every limit. Unicode and whitespace where strings are parsed.
4. **State and ordering** — where it matters: re-entry, idempotency, concurrent access, partial failure leaving state half-written.
5. **Regressions** — for a bug fix, a test that reproduces the original bug.

## How to write them

- **One behavior per test.** A test asserting five unrelated things tells you nothing useful when it fails.
- **Name the test after the behavior and condition**: `returns_empty_list_when_no_matches`, not `test_search_2`.
- **Arrange / act / assert**, visibly separated. A reader should see the setup, the call, and the claim.
- **Assert on the specific thing.** `expect(result.status).toBe(404)` beats `expect(result).toBeTruthy()`. An assertion that cannot fail is worse than no test.
- **Test through the public surface.** Reaching into private state couples the test to the implementation and it will break on every refactor.
- **Mock only what you must** — network, clock, filesystem, randomness, third-party services. Mocking your own code under test means you are testing the mock.
- **Keep tests deterministic.** No real sleeps, no reliance on wall-clock time or iteration order, no shared mutable fixtures between tests.

## Verify the tests are real

A test suite that has never failed proves nothing. For each meaningful test:

1. Run it and watch it pass.
2. Break the code under test deliberately — invert a condition, return a wrong value.
3. Confirm the test fails, and fails with a message that points at the cause.
4. Restore the code.

For a bug fix, do this in the honest order: write the test, watch it fail against the unfixed code, apply the fix, watch it pass.

## Do not

- Change assertions to match wrong behavior. If a test legitimately fails, that is a finding to report.
- Add `skip`, `only`, or a broad try/catch to get green.
- Chase a coverage number with tests that execute lines without asserting anything.
- Rewrite unrelated existing tests while you are in the file.

## Report

The command run, the pass/fail count as actually printed, what is now covered, and — explicitly — what is still not covered and why.
