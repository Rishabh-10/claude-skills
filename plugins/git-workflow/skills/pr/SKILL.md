---
name: pr
description: Open a pull request for the current branch with a description written from the actual diff — what changed, why, and how it was verified. Use when the user asks to open, create, or draft a PR.
argument-hint: "[optional title or target branch]"
disable-model-invocation: true
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git push:*), Bash(git merge-base:*), Bash(gh pr:*), Bash(gh repo:*), Read
---

# Pull request

## Context

```!
git branch --show-current
git status --short
git log --oneline origin/HEAD..HEAD 2>/dev/null || git log --oneline -10
```

## 1. Preflight

Stop and report rather than proceeding if any of these hold:

- **Uncommitted changes.** Ask whether to include them; do not silently commit or silently leave them out.
- **On the default branch.** A PR needs its own branch. Offer to create one and move the commits.
- **Nothing to compare.** If the branch has no commits ahead of its base, there is no PR to open.
- **`gh` is not installed or not authenticated.** Say so and offer to print the description for manual use instead.

## 2. Read what you are actually shipping

```
git diff $(git merge-base HEAD origin/HEAD)...HEAD --stat
git log $(git merge-base HEAD origin/HEAD)..HEAD --format='%s%n%b'
```

Write the description from the **diff**, not from your memory of the session. Work you did and reverted is not part of the PR; work someone else pushed to the branch is.

## 3. Match the repo's template

Check `.github/PULL_REQUEST_TEMPLATE.md` (and `.github/PULL_REQUEST_TEMPLATE/`) and fill in its actual sections. If there is a template, it wins over the structure below.

Otherwise:

```markdown
## Summary
2-4 sentences: what this changes and why it was needed. Lead with the user-visible
or system-visible outcome, not the implementation.

## Changes
- Bullet per meaningful change, grouped by area. Skip mechanical churn.

## Testing
Exactly what was run and what the result was, plus anything a reviewer should
check manually. If something was not tested, say so here.

## Notes for reviewers
Anything non-obvious: a design tradeoff, a deliberate omission, a follow-up
already planned, a file worth looking at first.
```

Link issues with the repo's closing keyword convention (`Closes #123`) only when this PR genuinely closes them.

## 4. Title

Match the repo's existing PR titles — check `gh pr list --limit 15 --state all`. If commits use Conventional Commits, the title usually should too. Under ~70 characters, imperative, specific: `Fix session expiry off-by-one on refresh`, not `Bug fixes`.

## 5. Push and open

Push the branch with upstream tracking if it has none, then:

    gh pr create --title "<title>" --body-file - <<'BODY'
    ...description...
    BODY

Use `--draft` when the work is incomplete or the user asked for a draft. Add `--base <branch>` when the target is not the default branch.

Report the PR URL.

## Honesty rules

- Never write "tested" for anything you did not run. Put the real command output in **Testing**.
- Never describe intended behavior as shipped behavior. If something is stubbed, say so in **Notes for reviewers**.
- Never force-push a branch that others may have pulled.
- Do not open a PR the user did not ask for.
