---
name: bootstrap
description: Set Claude Code up in a repository from scratch — investigate the codebase, write a CLAUDE.md grounded in what is actually there, and wire .claude/settings.json with sensible permissions. Use on a repo with no Claude configuration, or to replace one that has gone stale.
argument-hint: "[optional focus - claude-md, settings, or omit for both]"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(git log:*), Bash(git ls-files:*), Bash(ls:*), Bash(cat:*)
---

# Bootstrap

Scope: **$ARGUMENTS** (default: `CLAUDE.md` and `.claude/settings.json`)

The output of this skill is only as good as the investigation behind it. **A generic
`CLAUDE.md` is worse than none** — it consumes context on every turn and teaches nothing,
while creating the false impression that the repo is documented.

## 1. Check what already exists

```!
ls -a
```

Look for `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.github/copilot-instructions.md`,
`.claude/`, `CONTRIBUTING.md`. If any exist, read them first and **extend rather than
replace** — an existing file encodes decisions you cannot see from the code. Tell the user
what you found before overwriting anything.

## 2. Investigate

Spend real effort here. Everything below must come from something you opened.

**Commands** — the highest-value section, and the one most often wrong. Read the actual
definitions in `package.json` scripts, `Makefile`, `justfile`, `pyproject.toml`,
`Cargo.toml`, `go.mod`, or `*.csproj`. Then cross-check against CI
(`.github/workflows/*.yml`): CI runs the commands that actually matter, in the order that
matters, with the environment they need. Note anything CI sets that a local run does not.

**Architecture** — read enough to identify the entry points, the top-level modules and what
each owns, and where things live that are not where you would expect. Skip whatever the
directory tree already makes obvious.

**Conventions** — infer from the code, and record only what the linter does not already
enforce: the error-handling idiom, the async model, test location and naming, import
rules, the logger. Check `.eslintrc`, `ruff.toml`, `.editorconfig` and friends, and do
*not* restate anything they cover.

**Constraints** — the rules that cause damage when broken. Look for append-only migration
directories, published API surfaces, generated files with a "do not edit" header, anything
touching payments, auth, or PII.

**Gotchas** — search the code and recent commits for the traps: `HACK`, `XXX`, `WORKAROUND`,
`do not`, `careful`. Read the last 30 commit subjects for the phrase "fix the fix" — repeat
fixes in one area mark a sharp edge worth writing down.

## 3. Write CLAUDE.md

Use [`templates/CLAUDE.md`](../../../../templates/CLAUDE.md) from this marketplace as the
skeleton. Fill only the sections you have evidence for, and **delete the rest** — every
unfilled bracket is a signal the file was never really written.

Hold it to these rules:

- **Nothing derivable from the code.** Claude can read the repo. It cannot guess that
  staging shares a database with production analytics.
- **Under 100 lines.** It loads on every single turn, so length is a permanent cost. If a
  section is growing into a procedure, it belongs in a skill instead
  (`.claude/skills/<name>/SKILL.md`), which loads only when used.
- **Specific over complete.** Five facts that are true beat twenty that are approximately
  true. An inaccurate `CLAUDE.md` actively misleads every future session.
- **No aspirations.** Document the repo as it is, not as it should be.

## 4. Write .claude/settings.json

Use [`templates/settings.json`](../../../../templates/settings.json) as the base. Tailor it:

- **`permissions.allow`** — the project's real read-only and test commands, taken from step
  2. This is where prompt fatigue actually comes from; getting `Bash(npm test:*)` in here
  is worth more than any other line in the file.
- **`permissions.deny`** — this repo's actual secret paths, not a generic list.
- **`enabledPlugins`** — only if the user wants the team on this marketplace's plugins.

Note for the user which scope you wrote to: `.claude/settings.json` is committed and
applies to everyone; `.claude/settings.local.json` is gitignored and personal. Put
anything machine-specific in the latter.

Add `.claude/settings.local.json` to `.gitignore` if it is not already there.

## 5. Report

- What you wrote, and the path.
- **The evidence behind each non-obvious claim** — particularly the commands, since a wrong
  command in `CLAUDE.md` wastes every future session.
- What you could not determine and left out, so the user can fill it in.
- The suggestion to run `/claude-setup:audit-context` in a few weeks to catch drift.

## Do not

- Write a section because the template has one. Delete what you cannot ground.
- Copy a command from a README without checking it against the manifest and CI. READMEs go
  stale first.
- Restate the tech stack at length. `package.json` already says it.
- Include coding advice that is not specific to this repo. General good practice does not
  belong in a per-repo file.
