# guardrails

Four hooks that run automatically once the plugin is enabled. No slash commands.

The scripts are dependency-free Node.js. The usual `bash` + `jq` hook pattern silently
does nothing on Windows; these behave identically everywhere Node runs.

Two decision levels are used deliberately:

- **deny** — blocked outright. Claude sees the reason and must find another way. Reserved
  for commands whose damage the user cannot undo either.
- **ask** — the user gets a normal permission prompt with the reason attached. Used for
  everything that is risky but frequently legitimate.

---

## `guard-bash` — `PreToolUse:Bash`

Inspects the command string before it runs.

### Denied

| Rule | Trigger |
| --- | --- |
| `rm-rf-wide` | `rm -rf` targeting `/`, `~`, `$HOME`, or a bare trailing `*` |
| `curl-pipe-shell` | `curl`/`wget` piped into a shell — unreviewed remote code execution |
| `block-device-write` | `dd`, `mkfs`, `fdisk` writing to `/dev/sd*`, `/dev/nvme*`, `/dev/disk*` |
| `force-push-default-branch` | Force-pushing or deleting `main`/`master`/`trunk` |
| `repo-delete` | `gh repo delete` |

### Prompts

| Rule | Trigger |
| --- | --- |
| `force-push` | Any `--force` push (`--force-with-lease` passes) |
| `discard-uncommitted` | `git reset --hard`, `git checkout -- `, `git restore .` |
| `git-clean` | `git clean -f` |
| `skip-hooks` | `--no-verify`, or `git commit -n` |
| `history-rewrite` | Interactive rebase, `filter-branch`, `filter-repo` |
| `chmod-777` | World-writable permissions |
| `sql-destructive` | `DROP`/`TRUNCATE TABLE\|DATABASE\|SCHEMA` |
| `sql-unbounded-delete` | `DELETE FROM <table>` or `UPDATE <table> SET` with no `WHERE` |
| `registry-publish` | `npm`/`yarn`/`pnpm`/`cargo`/`gem`/`twine`/`nuget` publish |
| `secret-file-read` | `cat`/`less`/`head` on `.env`, `id_rsa`, `*.pem`, `credentials` |

**False positives are the main risk in a hook like this**, so two mitigations are built in.
Commands led by a read-only tool (`grep`, `rg`, `cat`, `echo`, `find`, …) skip the SQL
rules — `grep -r 'DROP TABLE' src/` is a search, not a migration. And the SQL rules require
real SQL shape (a table name, `SET` for `UPDATE`), so a commit message reading
`UPDATE the docs` passes untouched.

## `protect-secrets` — `PreToolUse:Read|Edit|Write|NotebookEdit`

Prompts before:

- **Reading credential files** — `.env*`, `id_rsa`/`id_ed25519`, `*.pem|key|pfx|p12`,
  `.npmrc`, `.netrc`, `credentials.*`, `service-account*.json`, `.aws/`, `.ssh/`, `.gnupg/`,
  `secrets.*`. Reading one copies live secrets into conversation history, where they stay.
- **Writing to those same paths** — a live secret one `git add` away from being committed.
- **Hand-editing generated files** — lockfiles, `node_modules/`, `dist/`, `build/`,
  `*.min.js`, `*.pb.go`. These desynchronise from their source; regenerate instead.

`.env.example`, `.env.template`, and `*.sample` are explicitly allowed — they hold
placeholders, and blocking them would be pure friction.

Paths are normalised to forward slashes before matching, so the rules behave the same on
Windows and POSIX.

## `format-file` — `PostToolUse:Edit|Write|NotebookEdit`

Runs the project's formatter on the file just edited, so formatting never shows up as
review noise.

Supported: **prettier**, **biome**, **ruff**, **black**, **gofmt**, **rustfmt**.

Three properties keep it from being annoying:

- **It only runs a formatter the project has configured.** No `.prettierrc`, no prettier.
  The hook never imposes a style the repo did not choose. For `ruff`/`black` it also checks
  that the tool is actually named in `pyproject.toml`, since that file's presence alone
  proves nothing.
- **It prefers the project-local binary** (`node_modules/.bin/`, `.venv/bin/`) over a
  global one, so the version matches CI.
- **It never fails the tool call.** A missing or broken formatter is reported as context at
  most. If the formatter errors — usually meaning the file does not parse — that fact is
  surfaced to Claude, which is useful, but the turn continues.

When a file is reformatted, Claude is told line numbers may have shifted so it re-reads
before editing again.

## `session-context` — `SessionStart`

Injects a compact snapshot at the start of every session: branch, ahead/behind counts,
uncommitted files, the last five commits, the detected stack with its real npm scripts, and
which project docs exist.

This replaces the three or four orientation tool calls that otherwise open every session.
It stays short on purpose — the text is prepended to every session, so each line has to
earn its place. Outside a git repo it emits nothing.

---

## Customising

Fork the plugin and edit `scripts/guard-bash.js`; the rules are a plain array of
`{ id, decision, test, reason }`. `reason` is shown to Claude, so it should say what to do
instead, not just what was blocked.

To disable one hook without forking, remove its block from `hooks/hooks.json`.

## Testing a change

```bash
node --check scripts/guard-bash.js

echo '{"tool_input":{"command":"git push --force origin main"}}' \
  | node scripts/guard-bash.js

echo '{"tool_name":"Read","tool_input":{"file_path":"/repo/.env"},"cwd":"/repo"}' \
  | node scripts/protect-secrets.js
```

Empty output means the call is allowed. A JSON object means a decision was returned.
