---
name: commit
description: Stage and commit the current work as one or more focused commits with messages that follow this repo's existing conventions. Use when the user asks to commit; never run it on your own initiative.
argument-hint: "[optional scope or message hint]"
disable-model-invocation: true
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git branch:*), Bash(git restore:*), Read
---

# Commit

## Context

```!
git branch --show-current
git status --short
git diff --stat
git log --oneline -12
```

## 1. Learn this repo's message style before writing one

Read the last dozen subjects above and match them. Do not impose Conventional Commits on a repo that does not use them, and do not write freeform prose in a repo that does. Check for `.gitmessage`, `commitlint.config.*`, `.czrc`, or a section in `CONTRIBUTING.md` — those are authoritative.

If the repo uses Conventional Commits, honor the type set already in use (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`) and the scope vocabulary already in the log.

## 2. Decide the commit boundaries

Read the full diff, not just the file list. Group changes into commits that each stand alone:

- One logical change per commit. A bug fix and an unrelated rename are two commits.
- A commit should leave the tree building and the tests passing.
- Refactors go in their own commit, separate from behavior changes — mixing them makes both unreviewable.
- If everything genuinely belongs together, one commit is correct. Do not split for the sake of splitting.

## 3. Stage deliberately

Stage by path (`git add <path>`), never `git add -A` or `git add .` — those sweep in build output, local config, and secrets.

Before staging, check for things that must not be committed: `.env`, credentials, API keys, tokens, large binaries, `node_modules`, IDE config, debug logging you added, commented-out code, and `TODO` markers you left as reminders. If you find any, stop and tell the user rather than committing around them.

## 4. Write the message

**Subject** — imperative mood, under ~72 characters, no trailing period. Say what the commit does, not what you did: `Fix session expiry off-by-one`, not `Fixed a bug where...`.

**Body** — only when the change is not self-explanatory. Explain **why**, not what; the diff already shows what. Wrap at 72. Cover the motivation, the approach if a reader would wonder, and any consequence that is not visible in the diff.

**Trailers** — reference issues in the format this repo already uses. Note breaking changes as `BREAKING CHANGE:` if the repo uses Conventional Commits.

Never claim in a message that something is tested or verified unless you actually ran it.

## 5. Commit and confirm

Commit with a heredoc so multi-line messages survive quoting:

    git commit -F - <<'MSG'
    Subject line here

    Body paragraph here.
    MSG

Then run `git status` and `git log -1 --stat` and report what landed.

## Hard rules

- **Never push** unless explicitly asked. Committing and pushing are separate decisions.
- **Never commit directly to `main`/`master`.** If that is the current branch, create a branch first and say so.
- **Never use `--no-verify`, `--amend` on a pushed commit, or `--force`.** If a hook fails, read the failure and fix the cause; a failing pre-commit hook is telling you something real.
- Do not add co-author or tooling attribution unless this repo's history already does.
