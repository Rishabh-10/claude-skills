---
name: explore
description: Map an unfamiliar codebase or subsystem before changing it — entry points, data flow, conventions, and the files that matter for a given task. Use when starting work in a repo you have not touched, when the user asks "how does X work", or before planning a non-trivial change.
argument-hint: "[area or question, e.g. auth flow]"
allowed-tools: Read, Grep, Glob, Bash(git log:*), Bash(git ls-files:*), Bash(ls:*), Bash(cat:*)
---

# Explore

Build an accurate mental model of `$ARGUMENTS` before touching anything. The output is understanding, not edits. **Do not modify files during this skill.**

## Ground rules

- Read before you guess. Every claim you make must trace to a file you actually opened.
- Prefer breadth first, then depth. Locate the boundaries of the subsystem before reading any one file end to end.
- Stop when you can answer the question. Exhaustive reading is a failure mode, not thoroughness.

## Procedure

### 1. Orient (cheap, always do this)

```!
git ls-files 2>/dev/null | head -50
```

Then check for the repo's own map: `README*`, `CLAUDE.md`, `CONTRIBUTING*`, `docs/`, `ARCHITECTURE*`, `adr/`. If a `CLAUDE.md` exists, its conventions override anything you infer from the code.

Identify the stack from manifests rather than file extensions: `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`, `*.csproj`, `Gemfile`. Note the scripts/targets defined there — those are the project's real build, test, and lint commands.

### 2. Find the entry points

Trace inward from where execution actually starts:

- **Service/API** — route or handler registration, then middleware, then the controller for the area in question.
- **CLI** — the `bin`/`main`/`__main__` and its argument parser.
- **Library** — the public export surface (`index.*`, `__init__.py`, `lib.rs`, `mod.rs`).
- **UI** — the router, then the page/screen that owns the feature.

### 3. Trace the path for the specific question

Follow one concrete request or call all the way through: entry → validation → business logic → persistence → response. Note each hop as `file:line`. This single trace teaches more than reading ten files in isolation.

### 4. Read the conventions off the code

Note, with evidence:

- How errors are raised and handled.
- How dependencies reach a module (constructor injection, imports, a container, globals).
- How tests are structured, named, and located, and what the fixture/mock style is.
- Naming and file layout patterns you would be expected to match.

### 5. Check the history where it is ambiguous

```
git log --oneline -15 -- <path>
```

Recent churn tells you what is actively changing. A file untouched for years with no tests is a warning, not a green light.

## Report

Keep it under a page. Structure:

- **What it does** — two or three sentences.
- **Key files** — a short list, each as a `path:line` link with one line on its role.
- **The flow** — the trace from step 3, as a numbered path.
- **Conventions to follow** — the patterns any change here must match.
- **Sharp edges** — surprises, dead code, missing tests, things that look wrong.
- **Open questions** — what you could not determine from the code, and what would answer it.

If the exploration was for a specific change, end with the two or three files that change will actually touch.

## Delegating

For a broad sweep across many directories where you only need the conclusion, dispatch the `dev-workflow:codebase-explorer` agent instead of reading serially. Do that when the answer requires scanning more than roughly a dozen files; do it yourself when the answer lives in a handful.
