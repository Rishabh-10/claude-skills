# claude-skills

A Claude Code plugin marketplace. Six plugins under `plugins/`, catalogued in
`.claude-plugin/marketplace.json`, plus portable templates in `templates/`.

There is no application here — the deliverables are Markdown instructions, agent
definitions, four Node.js hook scripts, and the career-tools document renderer
(`plugins/career-tools/skills/tailor/render.js`).

## Commands

| Task | Command |
| --- | --- |
| Validate everything | `bash scripts/validate.sh` |
| Check frontmatter only | `node scripts/check-frontmatter.js .` |
| Syntax-check hooks | `node --check plugins/guardrails/scripts/*.js` |
| Smoke-test the renderer | `node plugins/career-tools/skills/tailor/render.js render <draft.json> <out-base>` |
| Install locally for testing | `claude plugin marketplace add ./` then `claude plugin install <name>@rishabh-dev-kit --scope local` |
| Refresh after an edit | `claude plugin install <name>@rishabh-dev-kit --scope local` (re-copies into the cache) |

`scripts/validate.sh` checks JSON syntax, JS parse, frontmatter presence, name/version
agreement between each `plugin.json` and its marketplace entry, and then runs
`claude plugin validate` on every plugin. Run it before every commit.

## Constraints

- **Target the installed CLI, not the latest docs.** The published plugin reference
  documents fields this repo's `claude` version rejects. Confirmed unsupported at
  v2.1.86: `displayName` in `plugin.json`, exec-form `command` arrays in `hooks.json`,
  `metadata.pluginRoot` in `marketplace.json`. Hook commands use the shell-string form
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/x.js"`, which works under both `sh` and PowerShell.
- **Never declare `hooks` in `plugin.json` when the file is at `hooks/hooks.json`.** That
  path is auto-discovered; declaring it too makes the plugin fail to load with a duplicate
  hooks error.
- **Version must match in two places** — `plugins/<name>/.claude-plugin/plugin.json` and
  the entry in `.claude-plugin/marketplace.json`. Bump both, or clients keep the cached
  copy. `validate.sh` enforces this.
- **Scripts (hooks and the renderer) stay dependency-free and cross-platform.** No `jq`, no bash-isms, no
  POSIX-only paths. Normalise paths to forward slashes before matching. These run on
  Windows.
- **A hook must never break a turn.** Exit 0 on every unexpected condition — missing
  binary, unparseable stdin, timeout. `_hook.js` handles the defaults; do not bypass it.

## Conventions

- **Skill frontmatter:** `name` and `description` always. The `description` is what Claude
  matches on for auto-invocation, so it must state *what it does* and *when to use it* —
  lead with the use case.
- **Always quote `argument-hint`.** `[` opens a YAML flow sequence, so an unquoted
  `argument-hint: [what to build]` parses as an array and fails schema validation; a comma
  makes it a multi-element array and a colon makes one element a map. Same for any scalar
  value starting with `[`, `{`, `*`, `&`, or `!`. `scripts/check-frontmatter.js` enforces
  this.
- **`disable-model-invocation: true`** on anything with side effects (commit, PR, release,
  changelog, refactor, plan). Claude must not decide on its own to commit or publish.
- **`allowed-tools`** listed narrowly, scoped to the specific commands the skill runs.
- **Agents get `disallowedTools: Write, Edit, NotebookEdit`** unless writing is the point.
  Review, explore, plan, and audit agents are strictly read-only.
- **Prose style:** direct, second person, imperative. Say what to do and why the rule
  exists. Every skill has a "do not" section — the failure modes are the valuable part.
- **No project-specific content.** These run in other people's repos. Skills read the
  target repo's conventions (`CLAUDE.md`, commit log, lint config, existing tests) and
  follow those rather than imposing a style.

## Working agreement

- Verify with `scripts/validate.sh` and paste the real output. A plugin that validates is
  not the same as a plugin that loads — install it and check `claude plugin list` shows
  `enabled`.
- Do not commit or push unless asked.
- Test hook script changes by piping a payload directly:
  `echo '{"tool_input":{"command":"..."}}' | node plugins/guardrails/scripts/guard-bash.js`
  Empty output means allowed; JSON means a decision was returned.

## Gotchas

- **The Bash tool halves `\\` inside heredocs.** Writing regex with `[\\/]` through a
  heredoc silently produces `[\/]`, which matches only forward slash — the Windows half of
  the pattern disappears with no error. Use the Write/Edit tools for regex-heavy files.
- **The Bash tool also truncates commands over roughly 6 KB**, which shows up as
  `unexpected EOF while looking for matching quote`. Write one file per call.
- `claude plugin uninstall <name>` defaults to user scope; pass `--scope local` to remove
  a locally installed copy.
