# claude-skills

A personal marketplace of [Claude Code](https://code.claude.com/docs) plugins for software
development — skills, subagents, and hooks that can be pulled into any repository, plus a
portable `CLAUDE.md` template.

Nothing here is project-specific. Every skill reads the target repo's own conventions
(`CLAUDE.md`, the commit log, the lint config, the existing test suite) and follows those
rather than imposing a house style.

## Install

```bash
# Add the marketplace once, per machine
claude plugin marketplace add Rishabh-10/claude-skills

# Then install what you want, globally or per project
claude plugin install dev-workflow@rishabh-dev-kit --scope user
claude plugin install code-quality@rishabh-dev-kit --scope user
claude plugin install git-workflow@rishabh-dev-kit --scope user
claude plugin install repo-setup@rishabh-dev-kit --scope user
claude plugin install career-tools@rishabh-dev-kit --scope user
claude plugin install guardrails@rishabh-dev-kit   --scope project
```

Or from inside a session: `/plugin marketplace add Rishabh-10/claude-skills`, then
`/plugin`.

Use `--scope project` for anything the whole team should get — it writes to
`.claude/settings.json`, which is committed. Use `--scope user` for your own tooling.

## What is in it

### `dev-workflow` — the build loop

| Command | What it does |
| --- | --- |
| `/dev-workflow:brainstorm` | Work out *what* to build: clarify the goal, generate genuinely different options, recommend one |
| `/dev-workflow:challenge` | Stress-test a plan before building — interrogate assumptions, name failure modes, give a verdict |
| `/dev-workflow:explore` | Map an unfamiliar codebase or subsystem: entry points, data flow, conventions, sharp edges |
| `/dev-workflow:plan` | Turn a request into a reviewable plan — file-by-file changes, test strategy, risks |
| `/dev-workflow:implement` | Execute a plan, matching the surrounding code, verifying with the project's own commands |
| `/dev-workflow:debug` | Hypothesis-driven root-cause hunting, one variable at a time |
| `/dev-workflow:map` | Mermaid diagrams of real structure, derived from actual imports and call sites |
| `/dev-workflow:handoff` | Write a durable handoff note so work can be resumed cold |

Plus `ai-pitfalls` — an auto-loading knowledge skill covering the failure modes specific to
AI-written code: silent assumptions, invented APIs, drive-by refactoring, speculative
abstraction, and claimed-but-unrun verification.

Agent: `codebase-explorer` (read-only fan-out search for broad exploration).

The full sequence is `brainstorm → challenge → plan → implement`, but each stands alone.
Skip to `/plan` when you already know what you are building.

### `code-quality` — review, test, harden

| Command | What it does |
| --- | --- |
| `/code-quality:review` | Review a diff for correctness bugs, thin coverage, and needless complexity |
| `/code-quality:test` | Write tests that cover failure paths and boundaries, then prove they can fail |
| `/code-quality:tdd` | Strict red-green-refactor: every test watched failing before the code that satisfies it |
| `/code-quality:refactor` | Restructure without behavior change, tests green at every step |
| `/code-quality:security-audit` | Trace untrusted input to sinks; report only findings with a real attack path |
| `/code-quality:deps-audit` | Vulnerabilities, unused packages, duplicated deps, and a safe upgrade order |

Agent: `code-reviewer` (parallel review for large diffs).

### `repo-setup` — configure Claude Code itself

| Command | What it does |
| --- | --- |
| `/repo-setup:bootstrap` | Investigate a repo, then write a grounded `CLAUDE.md` and `.claude/settings.json` |
| `/repo-setup:new-skill` | Author a new skill: frontmatter that triggers, a body that instructs, a test that proves it fires |
| `/repo-setup:audit-context` | Find config drift — dead commands, stale architecture, skills that never trigger |

Run `/repo-setup:bootstrap` first in any new repo; run `/repo-setup:audit-context`
every few months, because `CLAUDE.md` rots faster than code and does it silently.

### `git-workflow` — commits through releases

| Command | What it does |
| --- | --- |
| `/git-workflow:commit` | Focused commits with messages matching this repo's existing style |
| `/git-workflow:pr` | Open a PR described from the actual diff, using the repo's template |
| `/git-workflow:changelog` | Changelog entries written for users, not committers |
| `/git-workflow:release` | Gated release: verify, version, changelog, tag — then stop before publishing |
| `/git-workflow:branch-cleanup` | Classify local branches as safe / keep / ask, and prune the safe ones |

All of these are manual-invoke only (`disable-model-invocation: true`). Claude will not
decide on its own to commit, open a PR, or cut a release.

### `career-tools` — tailored applications

| Command | What it does |
| --- | --- |
| `/career-tools:tailor` | Resume + job description in, tailored resume and cover letter out as PDF and DOCX |

```
/career-tools:tailor ~/cv.pdf https://jobs.example.com/staff-engineer
/career-tools:tailor resume.docx job.txt --resume-only
```

The resume can be PDF, DOCX (via pandoc), LaTeX, Markdown, or text; the posting can be a
file, a URL, or pasted text. It decodes the posting, maps every requirement to evidence in
the resume, then rewrites: reorders, rewords into the posting's vocabulary, cuts what does
not serve the role. It never adds a skill, title, or number the original lacks; missing
metrics come back as questions in its report instead.

Agent: `application-reviewer` checks every tailored claim against the original resume and
scores requirement coverage before anything is rendered.

Output is `<Name>_Resume` and `<Name>_Cover_Letter`, each as `.pdf` and `.docx`, in
`$CAREER_TOOLS_OUTPUT_DIR/<company>-<role>/` (default `./applications/<company>-<role>/`).
Set the folder once in `~/.claude/settings.json`:

```json
{ "env": { "CAREER_TOOLS_OUTPUT_DIR": "C:/Users/you/Documents/applications" } }
```

The bundled renderer builds the DOCX with the [`docx`](https://www.npmjs.com/package/docx)
package and converts it to PDF with Microsoft Word (Windows) or LibreOffice, so both files
match exactly. Install once:

```bash
npm install -g docx
# PDF conversion, if Word is not installed:
winget install TheDocumentFoundation.LibreOffice   # or: brew install --cask libreoffice
# Optional, to read .docx resumes as input:
winget install JohnMacFarlane.Pandoc               # or: brew install pandoc
```

### `guardrails` — hooks, no commands

Runs automatically once enabled. See [plugins/guardrails/README.md](plugins/guardrails/README.md)
for the full rule list.

| Hook | Event | Behavior |
| --- | --- | --- |
| `guard-bash` | `PreToolUse:Bash` | Denies catastrophic commands (`rm -rf /`, `curl \| sh`, force-push to `main`); prompts for risky-but-legitimate ones (`git reset --hard`, `npm publish`, unbounded `DELETE`) |
| `protect-secrets` | `PreToolUse:Read\|Edit\|Write` | Prompts before reading credential files into the transcript, or hand-editing generated files and lockfiles |
| `format-file` | `PostToolUse:Edit\|Write` | Runs the formatter **the project has configured** — never imposes one |
| `session-context` | `SessionStart` | Injects branch, tree state, recent commits, and detected stack |

The scripts are Node.js with no dependencies, so they work identically on Windows, macOS,
and Linux. Hooks that use `bash` + `jq` — the common pattern — silently do nothing on
Windows.

## The `CLAUDE.md` template

[`templates/CLAUDE.md`](templates/CLAUDE.md) is a fill-in-the-blanks project memory file.
It is deliberately short: `CLAUDE.md` loads on every turn, so its length is a permanent
context cost. It carries only what cannot be read off the code — commands, non-obvious
architecture, constraints, and the gotchas that have already cost someone an afternoon —
plus a working agreement covering scope, verification, and honesty about what was tested.

[`templates/settings.json`](templates/settings.json) is a companion example for
`.claude/settings.json`: enabled plugins, a read-only allowlist to cut permission prompts,
deny rules for secrets, and one project-specific hook.

```bash
cp templates/CLAUDE.md /path/to/your/repo/CLAUDE.md
```

Then fill in the bracketed sections and delete the rest.

## Design principles

These are the rules the whole collection is written to. They are worth stating because
they are what make the skills useful in someone else's repo rather than only in mine.

1. **The repo's conventions win.** Every skill reads `CLAUDE.md`, the commit log, the lint
   config, and the existing tests before acting, and matches what it finds.
2. **Verify, then claim.** Skills are instructed to run the real command and paste the real
   output. Nothing is reported as passing on the strength of having been written.
3. **Findings must be falsifiable.** Review and audit skills require a concrete failure
   scenario before a finding ships. A false positive costs more than a missed nit.
4. **Side effects are opt-in.** Anything that writes to the outside world — commit, PR,
   release, publish — is manual-invoke only and stops before the irreversible step.
5. **Scope stays where the user put it.** Improvements found along the way get reported,
   not silently made.
6. **Cross-platform by construction.** No `jq`, no bash-isms, no POSIX-only paths.

## Repository layout

```
.claude-plugin/marketplace.json   catalog of the six plugins
plugins/<name>/
  .claude-plugin/plugin.json      manifest
  skills/<skill>/SKILL.md         slash commands + auto-loaded knowledge
  agents/<agent>.md               subagent definitions
  hooks/hooks.json                hook wiring (guardrails only)
  scripts/*.js                    hook implementations (guardrails only)
templates/                        portable CLAUDE.md + settings.json
scripts/validate.sh               validates every plugin
scripts/check-frontmatter.js      YAML frontmatter linter
```

## Prior art

Several skills here were shaped by ideas from other collections. Credit where it is due:

| Source | What it contributed |
| --- | --- |
| [obra/superpowers](https://github.com/obra/superpowers) | Socratic brainstorming before planning; strict red-green-refactor as its own discipline |
| [mattpocock/skills](https://github.com/mattpocock/skills) | Interrogating a plan until every branch of the design tree resolves — the basis for `/challenge` |
| [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | The four principles (think before coding, simplicity first, surgical changes, goal-driven execution) behind `ai-pitfalls` and the template's working agreement |
| [everything-claude-code](https://github.com/worldflowai/everything-claude-code) | Bootstrapping agent config into a repo; Node.js hooks for cross-platform support |
| [graphify](https://github.com/safishamsi/graphify), Understand-Anything | Treating a codebase as a navigable structure — the basis for `/map` |
| [travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills) | The survey that led to most of the above |

Deliberately **not** included: document generation (covered by
[anthropics/skills](https://github.com/anthropics/skills) officially) and UI/design polish
(`impeccable`, `ui-ux-pro-max`) — a different domain that deserves its own grounded
treatment rather than a thin imitation here.

## Developing

```bash
./scripts/validate.sh          # JSON, JS, frontmatter, versions, plugin validate
node --check plugins/guardrails/scripts/*.js
```

To iterate on a plugin without publishing, add this checkout as a local marketplace:

```bash
claude plugin marketplace add ./                 # from the repo root
claude plugin install dev-workflow@rishabh-dev-kit --scope local
```

Skill and agent bodies are re-read on install, so bump the plugin `version` in both
`plugin.json` and `marketplace.json` when publishing a change, or clients will keep the
cached copy.

## License

MIT — see [LICENSE](LICENSE).
