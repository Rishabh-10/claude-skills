---
name: audit-context
description: Check a repo's Claude configuration for drift — commands in CLAUDE.md that no longer work, stale architecture claims, skills that never trigger, and permission rules causing avoidable prompts. Use periodically, or when Claude keeps getting something wrong about the project.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash(git log:*), Bash(git ls-files:*), Bash(ls:*), Bash(cat:*)
---

# Audit context

`CLAUDE.md` rots faster than code, and silently. A command that was renamed six months ago
still sits there being read into every session, wasting a tool call each time and quietly
teaching the wrong thing. This skill finds that drift.

## Inventory

```!
ls -a .claude 2>/dev/null
ls CLAUDE.md AGENTS.md .claude/settings.json .claude/settings.local.json 2>/dev/null
```

## 1. Verify every command

The highest-value check, because a wrong command wastes every future session.

For each command in `CLAUDE.md`, confirm it still exists in the manifest that defines it —
`package.json` scripts, `Makefile` targets, `pyproject.toml`, `justfile`. Then cross-check
against `.github/workflows/`: if CI runs something different, CI is right and the file is
stale.

Report each as **verified**, **renamed** (with the current name), or **gone**.

## 2. Verify the architecture claims

Take each structural statement in `CLAUDE.md` and check it against the tree. Directories
get renamed, modules get split, and the description outlives the layout. Anything naming a
path that no longer exists is a finding.

## 3. Find what is missing

Look at what has changed since the file was written:

```
git log --oneline -30
git diff --stat HEAD~30..HEAD -- . | tail -20
```

New top-level directories, a new service, a changed test framework, a new required
environment variable — anything a newcomer would need that the file does not mention.

Then check the traps: grep recent commits for repeat fixes in one area, and the code for
`HACK`, `XXX`, `WORKAROUND`. Gotchas learned since the file was written are the most
valuable thing to add.

## 4. Find what should not be there

- **Derivable content.** Anything Claude gets from reading the code — the language, the
  framework, the directory listing — is pure context cost.
- **Lint-enforced conventions.** If `.eslintrc` or `ruff.toml` enforces it, saying it again
  changes nothing.
- **Generic advice.** "Write clean code", "add tests" — these do not alter behavior and
  crowd out the facts that would.
- **Grown procedures.** A section that has become numbered steps belongs in a skill, where
  it loads only when used.

Report the line count and what it could drop to.

## 5. Check the skills

For each skill in `.claude/skills/`:

- Does the `description` contain the words a user would actually type? A skill that never
  auto-triggers is dead weight, and the description is nearly always the cause.
- Do any two skills overlap enough that neither triggers reliably?
- Does anything with side effects — deploy, commit, release, publish — have
  `disable-model-invocation: true`? If not, that is a real risk, not a style note.
- Do referenced files and scripts still exist?

## 6. Check the settings

- **Permission prompts** you keep approving for the same read-only command belong in
  `permissions.allow`. This is the cheapest quality-of-life fix available.
- **`permissions.deny`** should name this repo's real secret paths.
- **Hooks** that reference missing scripts, or that use `bash`/`jq` in a team with Windows
  developers, silently do nothing.
- **Scope**: machine-specific values in committed `settings.json` should move to
  `settings.local.json`.

## Report

Ranked by cost of being wrong:

1. **Wrong** — actively misleading. Stale commands and dead paths. Fix first.
2. **Missing** — should be there and is not.
3. **Waste** — derivable, redundant, or generic content to delete, with the line count saved.
4. **Structural** — skills that never fire, side-effect skills left auto-invocable,
   permission rules worth adding.

Give the concrete edit for each. **Do not apply them without being asked** — this skill
reports; changing the project's memory file is the user's call.
