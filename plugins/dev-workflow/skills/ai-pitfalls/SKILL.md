---
name: ai-pitfalls
description: The failure modes specific to AI-written code — silent assumptions, invented APIs, drive-by refactoring, speculative abstraction, and false claims of verification — and the habits that avoid each. Load before implementing anything non-trivial, and when reviewing code an agent wrote.
when_to_use: Use at the start of any implementation task, when a change has grown larger than expected, or when reviewing agent-generated code for the characteristic mistakes.
---

# AI coding pitfalls

These are the failure modes that show up specifically in model-written code. None of them
look like errors while they are happening — that is what makes them expensive. Each one
below has a tell you can check for.

## 1. Silent assumptions

**The failure:** an ambiguity appears, you resolve it internally, and you keep going. The
user never learns a decision was made on their behalf. Half the time the guess is wrong,
and by then it is load-bearing.

**The tell:** you can finish the task, but you could also finish a *different* version of
the task and both would match the request.

**Instead:** notice the fork. Do everything that does not depend on it. Then either state
the assumption in one line and proceed — *"assuming existing rows keep the old default"* —
or ask, if getting it wrong would waste the work. Never resolve it invisibly.

## 2. Not surfacing confusion

**The failure:** something does not add up — a function does the opposite of its name, two
files disagree, the request contradicts the code — and you route around it and continue.

**The tell:** you find yourself constructing an explanation for why something odd is
probably fine.

**Instead:** say it. *"`validateUser` doesn't validate anything, it hydrates a session —
this may be a naming bug or I may be missing context."* Confusion is information. Suppressing
it in the name of momentum is how a wrong mental model gets baked into a change.

## 3. Over-engineering

**The failure:** you build for the second use case, which does not exist. A config option
nobody asked for, a strategy interface with one implementation, a plugin system for a
script, an abstraction wrapping a single call site.

**The tell:** an interface with one implementer; a parameter never passed anything but its
default; the phrase "this makes it easier to extend later" in your own reasoning.

**Instead:** write the minimum that solves the stated problem. The second use case, when it
arrives, will differ from your guess and the abstraction will have to change anyway.
Duplication is cheaper to fix than a wrong abstraction. If you genuinely see a case for
extensibility, say so — do not build it unasked.

## 4. Drive-by refactoring

**The failure:** while fixing one thing you rename variables, reorder imports, restructure
a nearby function, tidy formatting in untouched code. The diff triples. The reviewer can no
longer see the actual fix.

**The tell:** `git diff --stat` shows files or hunks that have nothing to do with the task.

**Instead:** stay inside the change. Improvements you notice go in the report, not the diff.
A clean three-line fix is worth more than the same fix buried in eighty lines of tidying —
and mixed diffs are where regressions hide.

## 5. Inventing APIs

**The failure:** you call a method with exactly the right name and signature for what you
need, and it does not exist. Plausible-looking library calls, config keys, CLI flags, and
environment variables are all easy to generate and easy to get wrong.

**The tell:** you wrote a call without opening the definition or the docs.

**Instead:** verify before you rely on it. Grep for the symbol, open the module, check the
installed version's actual surface. Do the same for anything from memory about a library —
APIs change, and your recollection may predate the version installed here.

## 6. Claiming verification you did not do

**The failure:** "tests pass", "this now works", "verified" — written on the strength of
having written the code carefully, not on the strength of having run anything. This is the
most damaging item on this list, because it destroys the user's ability to trust any
report.

**The tell:** you are about to write a completion claim and cannot point to the command
output that backs it.

**Instead:** run the thing. Paste the real output. If tests fail, say so with the failure.
If you could not run something, say *that* — "not run: no database available locally" is a
useful, honest report. Never describe intended behavior as observed behavior.

## 7. Making tests pass instead of making code work

**The failure:** a test fails, so the assertion changes, or a `skip` appears, or the
try/catch widens until the error stops surfacing. The suite goes green. The bug ships.

**The tell:** you are editing a test to accommodate a change rather than because the
specification changed.

**Instead:** a legitimately failing test is a finding, and it gets reported. Only change a
test when the intended behavior genuinely changed — and say explicitly, in the report, that
you changed it and why.

## 8. Fixing the symptom

**The failure:** a null check at the crash site instead of finding the producer that
emitted null. A retry around a call that fails for a deterministic reason. The stack trace
goes away; the defect stays.

**The tell:** you cannot explain the full chain from cause to symptom.

**Instead:** trace to where the invariant was actually broken and fix it there. If you fix
at the surface deliberately — because the real fix is out of scope — say so and name the
real cause.

## 9. Losing the thread on long tasks

**The failure:** eight steps in, the original success criterion has quietly been replaced
by "get this file to compile". The work continues, productively, on the wrong objective.

**The tell:** you cannot state what "done" means in one sentence without rereading the
request.

**Instead:** state the success criterion before starting, and re-check against it at each
milestone. When you finish, verify against the original request, not against your most
recent subtask.

## 10. Agreeing by default

**The failure:** the user proposes an approach with a real problem in it, and you build it
because they asked. Deference feels safe; it is not. The user asked for a competent
collaborator, and an objection costs one sentence.

**Instead:** state the concern once, concretely, then proceed with what they asked unless
they change direction. If they reaffirm, that is their decision — build it in full, without
relitigating. See `/dev-workflow:challenge` for doing this properly before work starts.

---

## The short version

1. **Think before coding.** Do not assume, do not hide confusion, present the options you
   see rather than silently picking one.
2. **Simplicity first.** The minimum that solves the actual problem. Nothing speculative.
3. **Surgical changes.** Touch only what the task requires. Clean up only your own mess.
4. **Goal-driven execution.** Define what done means, then verify against it with real
   output before claiming it.

*Failure modes 1–4 and this summary are adapted from Andrej Karpathy's observations on LLM
coding pitfalls, via [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills).*
