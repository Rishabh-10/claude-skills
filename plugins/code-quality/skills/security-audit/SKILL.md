---
name: security-audit
description: Audit code for exploitable vulnerabilities — injection, broken authz, secret exposure, unsafe deserialization, SSRF — with a concrete attack path for each finding. Use before shipping anything that handles untrusted input, auth, or secrets, or when asked for a security review.
argument-hint: "[optional scope - diff, path, or full]"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git log:*), Bash(git status:*)
---

# Security audit

Scope: **$ARGUMENTS** (default: the current diff)

Defensive review of code you have been asked to secure. Report vulnerabilities and how to fix them; do not produce working exploit payloads beyond the minimum needed to demonstrate that a finding is real.

## Trace trust boundaries, do not pattern-match

Start from where untrusted data enters — HTTP params, headers, cookies, request bodies, uploaded files, webhook payloads, queue messages, CLI args, environment, third-party API responses, database rows written by users. Follow each one forward until it reaches a **sink**. A finding requires a complete path from source to sink with no effective sanitisation in between.

## Sinks to trace to

**Injection**
- SQL/NoSQL: string-built queries, `LIKE` patterns, dynamic `ORDER BY` or table names that parameterisation does not cover.
- Command: `exec`, `spawn` with a shell, `system`, `subprocess` with `shell=True`, backticks.
- Path: user input reaching file reads and writes — check for `..`, absolute paths, symlinks, and normalisation done *before* rather than after decoding.
- Template/SSTI, XPath, LDAP, regex (catastrophic backtracking on user-supplied patterns).

**AuthN / AuthZ** — the highest-value category and the most often missed
- Every new route and handler: is there an authentication check, and separately an *authorization* check?
- Object-level access: does the handler verify the resource belongs to the caller, or only that the caller is logged in? (IDOR)
- Privilege escalation via mass assignment — user-controlled fields reaching a model update that includes `role`, `isAdmin`, `ownerId`.
- Token handling: expiry validated, signature verified, algorithm pinned (not `none`, not caller-selected), audience and issuer checked.

**Secrets**
- Credentials, keys, tokens in source, config committed to the repo, test fixtures, or error messages.
- Secrets in logs — especially whole request objects, headers, or exception dumps.

**Web**
- XSS: unescaped output, `dangerouslySetInnerHTML`, `innerHTML`, `v-html`, unsanitized markdown.
- CSRF on state-changing routes that rely on cookies.
- Open redirect from a user-supplied `next` or `returnUrl`.
- SSRF: user-supplied URLs fetched server-side; check for allowlists, and for DNS-rebinding and redirect-following gaps.
- CORS: reflected `Origin`, or a wildcard combined with credentials.

**Crypto and randomness**
- `Math.random` or `rand()` for tokens, IDs, or resets. Weak or absent password hashing. Hardcoded IVs, ECB mode, non-constant-time comparison of secrets.

**Deserialization and parsing**
- `pickle`, `yaml.load`, native Java or PHP deserialization, prototype pollution via merge/clone of user JSON, XXE in XML parsers.

**Dependencies and supply chain**
- Known-vulnerable pinned versions, unpinned installs in build scripts, `postinstall` scripts, typosquat-adjacent names.

## Verification bar

For each candidate, state the concrete attack: **who** the attacker is, **what** they send, **what** they get. If you cannot construct that path — because input is validated upstream, the value is not attacker-controlled, or the framework escapes it by default — drop the finding.

Check the framework defaults before reporting: many ORMs parameterise automatically, and most template engines escape by default. Reporting those as vulnerabilities destroys trust in the whole report.

## Report

Ranked by exploitability and impact.

For each:
- **Severity** and category, `path/file:line`.
- **Attack path** — source to sink, with the specific input.
- **Impact** — what an attacker actually gains.
- **Fix** — the concrete change; name the safe API rather than saying "sanitize input".

Then **Checked and sound** — the classes you examined and found correctly handled. Then **Not covered** — what this audit did not reach (runtime config, infrastructure, dependencies not scanned), stated plainly so nobody mistakes the scope.
