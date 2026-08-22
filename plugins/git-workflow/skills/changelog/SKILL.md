---
name: changelog
description: Generate or update a CHANGELOG entry from the commits since the last release, grouped by change type and written for users rather than committers. Use when preparing a release or when asked to update the changelog.
argument-hint: "[optional version, e.g. 1.4.0]"
disable-model-invocation: true
allowed-tools: Bash(git log:*), Bash(git tag:*), Bash(git describe:*), Bash(git diff:*), Read, Edit, Write
---

# Changelog

Target version: **$ARGUMENTS** (if omitted, write to an `Unreleased` section)

## Context

```!
git describe --tags --abbrev=0 2>/dev/null || echo "no tags"
git tag --sort=-creatordate | head -5
```

## 1. Establish the range

Everything since the last release tag:

    git log <last-tag>..HEAD --format='%h %s%n%b'

If there are no tags, use the whole history or ask for a starting point rather than guessing.

## 2. Match the existing file

Read the current `CHANGELOG.md` before writing. Match its heading style, date format, version link style, and grouping. If it follows [Keep a Changelog](https://keepachangelog.com/), keep to those categories: **Added, Changed, Deprecated, Removed, Fixed, Security**.

New entries go at the top, under the new version heading with an ISO date.

## 3. Translate commits into user-facing entries

This is the part that matters. A changelog is read by people deciding whether to upgrade, not by people reviewing the diff.

- **Write the effect, not the mechanism.** `Fixed sessions expiring an hour early in non-UTC timezones`, not `Fix off-by-one in getExpiry()`.
- **Drop what users cannot observe**: refactors with no behavior change, test-only commits, CI config, formatting, dependency bumps with no user impact, merge commits.
- **Merge related commits** into one entry. Three commits fixing one bug are one line.
- **Lead with the noun that matters** so the list is scannable.
- **Call out breaking changes loudly**, in their own section at the top, with the migration step spelled out. This is the single most valuable part of any changelog.
- Reference the PR or issue number in the repo's existing style, if it uses one.

## 4. Version number

If the version was not given, propose one from semver and the content: a breaking change forces a major, a new feature a minor, fixes only a patch. State your reasoning in one line and let the user confirm — **do not tag or release**, only write the file.

## Rules

- Every entry must trace to a real commit in the range. Never invent or embellish.
- Do not rewrite past released sections; they are history.
- Do not tag, bump version files, or publish — this skill writes the changelog and stops.
