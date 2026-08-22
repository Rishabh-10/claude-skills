---
name: deps-audit
description: Audit project dependencies for known vulnerabilities, unused packages, duplicated functionality, and risky version drift, then propose a safe upgrade order. Use when asked to check or update dependencies, or before a release.
argument-hint: "[optional focus - security, unused, or upgrade]"
disable-model-invocation: true
---

# Dependency audit

Focus: **$ARGUMENTS** (default: all three passes)

## 1. Identify the real dependency set

Read the manifest *and* the lockfile — the lockfile is the truth about what actually installs.

| Ecosystem | Manifest | Lockfile | Audit command |
| --- | --- | --- | --- |
| Node | `package.json` | `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock` | `npm audit`, `pnpm audit` |
| Python | `pyproject.toml`, `requirements.txt` | `poetry.lock`, `uv.lock` | `pip-audit` |
| Go | `go.mod` | `go.sum` | `govulncheck ./...` |
| Rust | `Cargo.toml` | `Cargo.lock` | `cargo audit` |
| Ruby | `Gemfile` | `Gemfile.lock` | `bundle audit` |
| .NET | `*.csproj` | `packages.lock.json` | `dotnet list package --vulnerable` |

Run the ecosystem audit tool if it is available. Do not guess at vulnerability data from memory — advisory databases change constantly and your knowledge of them is stale by definition.

## 2. Security pass

For each reported advisory, do not stop at the CVSS score:

- **Is the vulnerable code path actually reachable** from this project? A prototype-pollution bug in a build-time-only tool is not the same risk as one in a request handler.
- **Is it a direct or transitive dependency?** Transitive fixes may need an override or resolution rather than a direct bump.
- **Is it a runtime or a dev dependency?** Dev-only issues matter for build integrity, not runtime exposure — say which.

Report reachability explicitly. "12 vulnerabilities" with no triage is noise.

## 3. Hygiene pass

- **Unused** — packages in the manifest with no import anywhere. Grep for the import name, not the package name; they often differ.
- **Duplicated purpose** — two date libraries, three HTTP clients, a utility library used for one function the standard library now provides.
- **Unmaintained** — last release years ago, archived repository, single maintainer with no successor. Note it as risk, not an emergency.
- **Heavy for the benefit** — a large transitive tree pulled in for one helper.
- **Wrong section** — test or build tooling sitting in runtime dependencies, which ships it to production.

## 4. Upgrade plan

Order by risk, and never batch a major with anything else:

1. **Security patches** within the current major — apply first, together, verify once.
2. **Minor and patch drift** — batch by ecosystem, run the full suite.
3. **Majors** — one at a time, each with its own commit. Read the changelog and migration guide for breaking changes *before* bumping, and name the ones that affect this codebase.

For each proposed upgrade give: current version, target version, why, and what could break here specifically.

## Rules

- **Do not upgrade anything without being asked.** This skill produces a report and a plan; applying it is a separate decision.
- Never edit a lockfile by hand — regenerate it with the package manager.
- After any bump, run install, build, typecheck, and the full test suite, and report the actual output.
- If the audit tool is not installed, say so rather than substituting your own recollection of which versions are vulnerable.
