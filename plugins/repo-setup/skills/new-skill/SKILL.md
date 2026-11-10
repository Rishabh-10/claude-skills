---
name: new-skill
description: Author a new Claude Code skill correctly — frontmatter that triggers reliably, a body that reads as instructions rather than documentation, and a test that proves it fires. Use when creating a skill, a slash command, or turning a repeated prompt into something reusable.
argument-hint: "[what the skill should do]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(ls:*), Bash(claude plugin validate:*)
---

# New skill

Building a skill for: **$ARGUMENTS**

## 1. Check it should exist

A skill earns its place when you keep pasting the same instructions, or when a section of
`CLAUDE.md` has grown from a fact into a procedure. Skills load only when used, so long
reference material costs nothing until needed — that is the whole advantage over `CLAUDE.md`.

Do not create one for a single-use prompt, or for something the model already does well
unprompted. Check whether an existing skill should be extended instead: two overlapping
skills means neither triggers reliably.

## 2. Pick the location

| Where | Path | Scope |
| --- | --- | --- |
| Personal | `~/.claude/skills/<name>/SKILL.md` | all your projects |
| Project | `.claude/skills/<name>/SKILL.md` | this repo, committed for the team |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | wherever the plugin is enabled |

The directory name becomes the command: `.claude/skills/deploy/` gives `/deploy`. Plugin
skills are namespaced, `/my-plugin:deploy`, so they cannot collide.

## 3. Write the frontmatter

```yaml
---
name: skill-name
description: What it does and when to use it, use case first.
argument-hint: "[what to pass]"
disable-model-invocation: true
allowed-tools: Read, Grep, Bash(git log:*)
---
```

**Quote `argument-hint`.** This is the most common YAML mistake in a SKILL.md, and it fails
quietly. Square brackets are flow-sequence syntax, so an unquoted `argument-hint: [file to
review]` parses as a one-element *array*, not a string — and the schema wants a string.
Add a comma and it becomes a multi-element array; add a colon, as in
`[version or bump type: major, minor]`, and it becomes an array containing a *map*. Wrap the
whole value in double quotes and none of that happens. The same applies to any other scalar
field whose value starts with `[`, `{`, `*`, `&`, or `!`, or that contains `: `.

**`description` is the single most important field.** It is the only part in context before
the skill loads, so it alone decides whether the skill ever fires. Write it as *what it
does* + *when to use it*, leading with the use case. Include the words a user would
actually type.

- Weak: `Helps with deployments.`
- Strong: `Deploy the current branch to staging, verifying the build and running smoke tests first. Use when asked to deploy, ship, or push to staging.`

Description and `when_to_use` are truncated together at 1,536 characters in the listing, so
front-load it.

**Invocation control** — get this right, it is where skills most often go wrong:

| Field | Effect | Use for |
| --- | --- | --- |
| *(neither)* | Claude auto-loads it, and `/name` works | most skills |
| `disable-model-invocation: true` | only you can invoke it | anything with side effects — deploy, commit, release |
| `user-invocable: false` | only Claude invokes it | background knowledge that is not an action |

Anything that writes to the outside world gets `disable-model-invocation: true`. You do not
want Claude deciding on its own that the code looks ready to ship.

**`allowed-tools`** pre-approves tools for the turn that invokes the skill, so it runs
without prompting. Scope the Bash rules narrowly — `Bash(git log:*)`, not `Bash`.

## 4. Write the body

The body is **instructions to a capable colleague**, not documentation about a feature.
Write in second person, imperative.

Structure that works:

1. One line restating the task, with `$ARGUMENTS` interpolated.
2. Preconditions — what to check before starting, and when to stop.
3. The procedure, in order, with the specific decisions called out.
4. **A "do not" section.** This is usually the most valuable part: the failure modes are
   what the model gets wrong unaided, and stating them is most of a skill's value.
5. The report format — what to tell the user at the end.

Keep it under about 500 lines. Move long reference material into sibling files in the skill
directory and point at them; they load only when read.

Useful substitutions: `$ARGUMENTS`, `$0`/`$1` for positional args, `${CLAUDE_SKILL_DIR}`
for bundled files, `${CLAUDE_PROJECT_DIR}` for project paths. And `` !`command` `` runs a
shell command *before* the content reaches Claude, so the skill opens with real data
instead of an instruction to go get it:

````markdown
## Context
```!
git status --short
git log --oneline -5
```
````

## 5. Test it

A skill that never triggers is a skill that does not exist. Verify both paths:

1. **Direct invocation** — type `/name` and confirm it loads and behaves.
2. **Auto-invocation** — in a fresh session, phrase a request the way a user naturally
   would, without naming the skill, and confirm Claude loads it. If it does not, the
   `description` is the problem, not the body.
3. **Plugin skills** — `claude plugin validate ./path-to-plugin`, then install and confirm
   `claude plugin list` shows it enabled.

Run it on a real task, not a toy one. Most weaknesses only appear against real input.

## Do not

- Write a description that describes the category rather than the trigger.
- Explain how a tool works when you mean to tell Claude what to do with it.
- Duplicate what the model already does well. A skill that says "write clean code" changes
  nothing; one that says "match the error-handling idiom in the sibling module" changes
  behavior.
- Leave both invocation fields off for a skill that deploys, commits, or publishes.
- Skip the "do not" section.
