<!--
  Generic CLAUDE.md — copy to the root of any repo and fill the bracketed parts.

  This file is loaded into context on every single turn, so length is a real
  cost. Two rules keep it useful:

    1. Only facts that are NOT derivable from the code. Claude can read the
       codebase; it cannot guess that staging shares a database with prod.
    2. If a section grows into a multi-step procedure, move it to a skill
       (.claude/skills/<name>/SKILL.md). Skills load only when used.

  Delete every section that does not apply. An accurate short file beats a
  thorough one that has drifted out of date.
-->

# [Project name]

[One or two sentences: what this is and who uses it. Include the thing a new
engineer would otherwise get wrong on day one.]

## Commands

Use these. Do not invent equivalents or call the underlying tools directly.

| Task | Command |
| --- | --- |
| Install | `[...]` |
| Run locally | `[...]` |
| Test (all) | `[...]` |
| Test (single file) | `[...]` |
| Lint | `[...]` |
| Type check | `[...]` |
| Build | `[...]` |

[Note anything that must run first — a database, a container, a codegen step —
and anything that is slow enough to be worth avoiding in a tight loop.]

## Architecture

[The 3–6 facts about structure that reading one file would not reveal.
Where the boundaries are, what depends on what, and where the code lives that
does not live where you would expect. Skip anything the directory tree already
makes obvious.]

- `[src/x/]` — [role]
- `[src/y/]` — [role]

[If there is a non-obvious data flow — a request path, an event pipeline, a
build step that rewrites code — describe it in a few lines here.]

## Conventions

[Only the ones a linter does not already enforce. If the formatter handles it,
do not write it down.]

- **Errors:** [how failures are raised and surfaced]
- **Async:** [the concurrency model and what is forbidden]
- **Types:** [strictness, what `any`/`interface{}`/`Object` means here]
- **Tests:** [where they live, naming, what must have coverage]
- **Imports:** [aliases, ordering, forbidden cross-module imports]
- **Logging:** [logger to use, what must never be logged]

## Constraints

[The rules that cause real damage when broken. Be specific and say why.]

- [e.g. `db/migrations/` are append-only — never edit an applied migration.]
- [e.g. Anything under `public/api/` is a published contract; changing a field
  is a breaking change requiring a version bump.]
- [e.g. The staging environment shares a database with production analytics.]

## Working agreement

These apply to every change in this repo:

- **Think before coding.** Do not resolve an ambiguity silently. If the request
  has two readings, say which one you took, or ask when getting it wrong would
  waste the work. Surface confusion rather than routing around it — a function
  that contradicts its name is worth mentioning, not working around.
- **Simplicity first.** Write the minimum that solves the stated problem.
  Nothing speculative: no option nobody asked for, no interface with one
  implementer, no abstraction built for a second caller that does not exist.
- **Surgical changes.** Touch only what the task requires. Clean up only your
  own mess. Do not refactor code that is not broken, reorder imports, or
  reformat files the change does not require — improvements get reported, not
  folded into the diff.
- **Verify, then claim.** Run the tests and the type checker and paste the real
  output. Never describe unverified work as done; if something could not be run,
  say that instead. If tests fail, say so with the failure.
- **Match the surrounding code.** Style, error handling, naming, and comment
  density come from the neighbouring files, not from general preference.
- **Reuse before adding.** Search for an existing helper before writing a new
  one; a duplicated utility is a defect.
- **Do not invent APIs.** Check the signature before calling it. Library
  knowledge from memory may predate the version installed here.
- **Never weaken a test to make a change pass.** A legitimately failing test is
  a finding to report, not an obstacle to remove.
- **Ask when the answer changes the work.** Make ordinary judgment calls
  independently; check in only when two readings lead to materially different
  outcomes.

## Git

- Branch from `[main]`; never commit directly to it.
- Commit messages follow [the existing log / Conventional Commits].
- Do not commit or push unless asked. They are separate decisions.
- Never use `--no-verify` or force-push a shared branch.

## Gotchas

[The things that have already cost someone an afternoon. This is usually the
most valuable section in the file — add to it whenever you hit one.]

- [e.g. `npm test` passes locally but CI sets `TZ=UTC`; date tests fail there.]
- [e.g. The dev server caches the schema — restart it after editing `schema.graphql`.]
