---
name: branch-cleanup
description: Find local branches that are merged, stale, or gone from the remote and propose which to delete, with a safety check on each. Use when the branch list has grown unwieldy or after several PRs have merged.
disable-model-invocation: true
allowed-tools: Bash(git branch:*), Bash(git fetch:*), Bash(git log:*), Bash(git remote:*), Bash(git status:*), Bash(gh pr:*)
---

# Branch cleanup

## Gather state

```!
git fetch --prune 2>&1 | tail -3
git branch --show-current
git branch -vv
```

`--prune` is what makes `[gone]` markers accurate; without it the whole analysis is stale.

## Classify every local branch

**Safe to delete**
- Merged into the default branch: appears in `git branch --merged origin/HEAD`.
- Upstream marked `[gone]` **and** no unpushed commits — the PR merged and the remote branch was deleted.
- Squash-merged: not listed as merged, but its diff against the base is empty. Verify with `git log --oneline origin/HEAD..<branch>` plus `gh pr list --state merged --head <branch>` before trusting this.

**Keep**
- The current branch and the default branch.
- Anything with commits not present on any remote — deleting these loses work permanently.
- Branches with an open PR.
- Anything modified recently, unless the user says otherwise.

**Ask**
- Old branches with unique unmerged commits. These are either abandoned or someone's parked work; you cannot tell which. List them with their last commit date and subject.

## Report before acting

Present the three groups. For each branch: name, last commit date, subject, and the reason for its classification. Show the count of unique commits for anything in **Ask**.

## Deleting

Only after the user confirms.

- Use `git branch -d` (safe delete — refuses if unmerged).
- Use `git branch -D` **only** for a branch you verified was squash-merged, and say explicitly that you are doing so and why.
- Never delete remote branches unless asked directly and by name.
- Never delete the current branch, the default branch, or anything with an open PR.

If `-d` refuses a branch you expected to be merged, that refusal is information — investigate rather than escalating to `-D`.

## Report

What was deleted, what was kept and why, and anything still needing a decision.
