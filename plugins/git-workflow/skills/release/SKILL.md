---
name: release
description: Run a release end to end — verify the tree is clean and green, pick the version, update version files and changelog, tag, and hand off the publish step. Use when the user asks to cut, prepare, or ship a release.
argument-hint: "[optional version, or bump type - major, minor, patch]"
disable-model-invocation: true
allowed-tools: Bash(git status:*), Bash(git log:*), Bash(git tag:*), Bash(git describe:*), Bash(git diff:*), Bash(git branch:*), Read, Edit
---

# Release

Requested: **$ARGUMENTS**

Releases are hard to reverse. Every gate below is there because skipping it has burned someone.

## 1. Preflight — stop on any failure

```!
git branch --show-current
git status --short
git describe --tags --abbrev=0 2>/dev/null || echo "no previous tag"
```

Verify, and stop with a clear report if any fails:

- Working tree is clean. No uncommitted or untracked source changes.
- On the release branch the project actually releases from (usually `main`), and up to date with its remote.
- Full test suite passes — run it, do not assume. Paste the real output.
- Build succeeds, type check and lint clean.
- CI on the current commit is green if the repo uses it (`gh run list --limit 3`).

## 2. Determine the version

Follow the repo's existing scheme — read the last few tags before assuming semver.

Under semver, derive the bump from the commits in range, not from preference:

- **Major** — any breaking change to a public interface, a removed option, a changed default that alters behavior, a dropped runtime version.
- **Minor** — new capability, backward compatible.
- **Patch** — fixes and internal changes only.

State the bump and the specific commit that forces it. If the user named a version that contradicts the commits, say so once, then use theirs.

## 3. Update the version everywhere it appears

Grep for the current version string — projects usually record it in more than one place: `package.json`, `pyproject.toml`, `Cargo.toml`, `version.go`, `__init__.py`, `*.csproj`, a constants file, docs, a Helm chart, a Dockerfile label. Missing one produces a release that lies about its own version.

Regenerate the lockfile with the package manager if it embeds the version; never hand-edit it.

## 4. Changelog

Run `/git-workflow:changelog <version>` and review the result. Confirm breaking changes appear at the top with migration steps.

## 5. Commit and tag

    git commit -m "Release v<version>"
    git tag -a v<version> -m "v<version>"

Match the repo's existing tag format exactly — check whether tags carry a `v` prefix before creating one.

## 6. Stop before publishing

**Do not push, do not publish, do not create a GitHub release without explicit confirmation.** Report:

- The version and why.
- What changed, in one paragraph.
- The verification output — tests, build, CI.
- The exact commands the user should run to publish: `git push --follow-tags`, then the registry publish command.

If the user then asks you to publish, run those commands and report the result.

## Failure handling

If any gate fails, stop and report. Do not release around a red test, a dirty tree, or a failed build. If a release must go out despite a known issue, that is the user's explicit call to make — and it belongs in the changelog.
