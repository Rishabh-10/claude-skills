---
name: tailor
description: Tailor a resume and write a matching cover letter for one specific job description, in one pass, without inventing experience, and deliver both as PDF and DOCX. Use when the user hands over a resume plus a job posting (file, URL, or pasted text) and wants an application package targeted at that role.
argument-hint: "<resume path> <job description path, URL, or pasted text> [--resume-only | --letter-only]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Bash(node:*), Bash(pandoc:*)
---

# Tailor an application

Input: **$ARGUMENTS**

The goal is the strongest *honest* application for one role: the candidate's real experience,
selected, ordered, and worded for what this employer is screening for. A tailored resume that
claims something the candidate cannot defend in an interview is worse than the untailored one.

## 1. Gather the inputs

Split the input into the resume and the job description. Each may be a file path, a URL, or
text pasted directly into the message. If either is missing, ask for it once and stop.

- **PDF, Markdown, LaTeX, plain text** - read directly.
- **DOCX** - convert with `pandoc <file> -t markdown`. If pandoc is not installed, ask for a
  PDF export or pasted text rather than guessing at the contents.
- **URL** - fetch it. Job boards behind a login (LinkedIn especially) usually return a shell
  page; if the fetched text has no actual requirements, ask for the posting to be pasted.

`--resume-only` skips the cover letter; `--letter-only` skips the resume. Default is both.

Then get the paths for this application, using a lowercase hyphenated slug such as
`acme-staff-backend-engineer`:

```
node "${CLAUDE_SKILL_DIR}/render.js" paths <company>-<role>
```

It creates the output folder (`$CAREER_TOOLS_OUTPUT_DIR/<slug>`, or `./applications/<slug>`
when that variable is unset) and prints `outDir`, `resumeDraft`, `letterDraft`, and
`factsFile`.

**Read the facts file if it exists.** It holds what the candidate has told you in earlier
runs: answers to the questions a resume leaves open (which cloud, which broker, who owned the
design, what they have not done). Those answers are the candidate's own statements, so they
are evidence with the same standing as something said in this conversation, and they apply to
every application, not only the one they were asked for. A resume states each thing once and
briefly; without this file every run asks the same questions again and the candidate retypes
the same answers.

## 2. Decode the job description

Write this down before touching the resume; everything after is measured against it.

- **Must-haves** - requirements stated as required, with the posting's exact wording.
- **Weighted signals** - what is repeated, listed first, or called critical. Ranks the must-haves.
- **Nice-to-haves** - "preferred", "bonus", "familiarity with".
- **The real problem** - why this role exists now: growth, a rebuild, a first hire, a backfill.
  This drives the cover letter.
- **Keywords** - the exact terms an applicant-tracking system or a recruiter's skim will match:
  tools, languages, methods, domain nouns, seniority words.

## 3. Build the evidence inventory

Read the resume end to end, and the facts file, and map each must-have and weighted signal to
evidence:

| Requirement (posting's words) | Evidence (resume line or facts-file entry) | Strength |
| --- | --- | --- |

Strength is **direct** (did exactly this), **adjacent** (did something transferable), or
**none**. This table is the boundary for everything you write next: a claim with no row of
evidence behind it does not go in.

A facts-file entry is evidence for exactly what it says. "Has used LangChain, no project built
with it" supports a familiarity mention, not a proficiency claim. A recorded "no" is a
settled answer: the requirement is **none**, and you neither claim it nor ask about it again.

## 4. Rewrite the resume

Allowed moves:

- **Reorder** sections, roles, and bullets so the strongest direct matches come first.
- **Reword** a bullet into the posting's vocabulary when it describes the same thing.
  "Data processing jobs" becomes "ETL pipelines" only if they were ETL pipelines.
- **Surface** a skill already evidenced in a bullet into the summary or skills section.
- **Rewrite the summary** (or add one) to target this role in two or three lines.
- **Compress or cut** material that does not serve this role. Do not grow the resume; hold or
  reduce its length.
- **Spell out an acronym once** alongside its short form ("continuous integration (CI)") so
  both match.

Forbidden moves - these are fabrication, regardless of how plausible they sound:

- Adding a tool, language, skill, certification, title, employer, or date the original does
  not contain and the user has not stated, in this conversation or in the facts file.
- Inventing or inflating a number. If a bullet would be stronger with a metric, ask about it in
  the report; do not supply the metric.
- Upgrading scope: "contributed to" into "led", "used" into "architected", team into company.
- Keyword stuffing - listing posting terms with no evidence row, including in white or hidden
  text.

Keep the format machine-readable: standard section headings (Experience, Education, Skills),
a single column, contact details as plain text. Keep the original's section order and page
count unless the posting gives a reason to change them.

## 5. Write the cover letter

Under 350 words, four short paragraphs:

1. **The role and the hook** - the exact title, and one specific reason this company or
   problem, drawn from the posting or the company's own material. Not generic praise.
2. **The match** - one or two direct-evidence stories from the inventory, told with the
   outcome, in the posting's vocabulary. Depth over a resume recap.
3. **The gap, if a must-have is "none" or "adjacent"** - name it plainly and give the honest
   bridge: the adjacent evidence and how fast the candidate ramps. Omit when there is no gap.
4. **The close** - a direct ask to talk, tied to the problem from step 2.

Cut on sight: "I am writing to express my interest", "passionate", "team player", "fast-paced
environment", "I believe I would be a great fit", and any sentence that would be equally true
in a letter to a different company.

The letter draws only on the evidence inventory. It has the same fabrication rules as the
resume.

Letter conventions:

- **Title.** Use the posting's exact job title in the opening sentence and in the `Re:` line.
  If the posting does not state one, ask; a title you guessed is a claim about a job that may
  not exist.
- **Letterhead.** Name, one line saying what the candidate is and where ("Backend Engineer |
  City, Country"), and phone and email. The descriptor is the specialty the posting is hiring
  for, taken from the resume, not the candidate's internal level: "SDE II" means something
  only inside their current employer. If the current title or level helps, it goes in the
  body ("where I am a Software Development Engineer II").
- **No profile links.** Leave LinkedIn, GitHub, and portfolio links off the letter unless the
  candidate's earlier letters carry them; the letter travels with the resume, which has them.
- **Numbers keep their subject.** A figure moved from a resume bullet into a sentence must
  still describe the same thing. "A platform serving 2M requests/day" must not turn into "my
  services, serving 2M requests/day".
- **Follow the candidate's earlier letters** for layout and structure when they exist: read
  one before drafting (step 6 covers how to express the layout).

## 6. Write the drafts

The deliverables are PDF and DOCX files. The bundled renderer builds the DOCX with the `docx`
npm package, then converts that DOCX to PDF (Microsoft Word on Windows, otherwise LibreOffice),
so the two always match. If it reports a missing package or converter, relay its install
command to the user and stop. Write each draft as JSON to the draft path printed in step 1:

```json
{
  "kind": "resume",
  "style": { "font": "serif", "paper": "a4" },
  "name": "Full Name",
  "contact": ["City, Country | [me@example.com](mailto:me@example.com) | +1 555 0100"],
  "sections": [
    { "heading": "Experience", "blocks": [
      { "row": ["**Company**", "**City, Country**"] },
      { "row": ["*Job Title*", "*Jan 2022 – Present*"] },
      { "bullets": ["Did a thing, with the outcome."] },
      { "p": "A plain paragraph." }
    ]},
    { "heading": "Projects", "blocks": [
      { "row": ["**[Project Name](https://github.com/me/project)**", "Go | PostgreSQL"] },
      { "bullets": ["Built a thing."] }
    ]}
  ]
}
```

- `kind` is `resume` or `letter`. A letter has one section with no heading: paragraphs, with
  `\n` for the line break in the sign-off.
- A `row` is a line with a left part and a right-aligned part (dates, location, a link); the
  right part may be `""`. Inline text supports `**bold**`, `*italic*`, and `[text](url)`, and
  the marks nest: `**[text](url)**` is a bold link.
- **Links.** Carry over every link in the original (contact line, project titles, portfolio)
  with its URL unchanged; a URL the original does not contain is fabrication like any other.
  A project title that has a link is a bold link, `**[Project Name](url)**`, so the title
  stays a heading and the reader can click through to the work. Write a URL with no spaces,
  starting `https://`, `http://`, or `mailto:`; the renderer rejects one it cannot attach.
- `style.font` is `serif` (Times New Roman), `sans` (Arial), or `calibri`; `style.paper` is
  `a4` or `letter`. Match the original resume's look; use `letter` paper for US and Canadian
  roles.
- **Letter layout.** If the candidate has earlier cover letters, read one and match it: a
  letter that looks unlike the ones they already sent reads as someone else's. `style.header`
  is `center` (name and contact centred, the default) or `left` (a letterhead: name, then
  muted contact lines, over a rule). The date, the addressee block (lines joined with `\n`),
  a bold `**Re: <exact title>**` line, the salutation, and the sign-off are each a `p`, used
  only when the candidate's letters have them. Take the title in the `Re:` line from the
  posting; if the posting does not state one, ask rather than invent it.

## 7. Verify with an independent review

Dispatch the `career-tools:application-reviewer` agent with the original resume and job
description as text (it cannot convert DOCX or fetch URLs), the draft paths, and the facts
file path when the file exists. Anything the candidate said in this conversation that is not
yet in the facts file goes in the prompt as text, and so does anything about the letter the
reviewer cannot see for itself: a job title the candidate supplied, and whether their earlier
letters carry profile links. It checks every claim against the original
and the candidate's stated facts, and scores the match cold. Fix every fabrication finding it
reports, then fix or consciously reject the coverage findings. Do not skip this step because
the drafts look right to you; you wrote them, so you are the worst judge of whether they
drifted.

## 8. Render

```
node "${CLAUDE_SKILL_DIR}/render.js" render <resumeDraft> "<outDir>/<First_Last>_Resume"
node "${CLAUDE_SKILL_DIR}/render.js" render <letterDraft> "<outDir>/<First_Last>_Cover_Letter"
```

Each writes a `.docx` and a `.pdf` and prints `pages` and `links`. Compare `links` with the
links in the original: every one must be there, pointing at the same URL. A missing link
means the draft dropped it or wrote it as plain text; fix the draft and render again.

If the resume runs longer than the original, cut the weakest material and render again; never
shrink the font or margins to fit.
If a file is open in Word, the renderer says so; ask the user to close it.

The output folder holds only these four files. Do not write Markdown, notes, or drafts there.

## Report

End with the four file paths, the match summary (each must-have and its strength), what
changed and why, the gaps that remain, the reviewer's verdict, and **questions that would
make this stronger**: missing metrics, unclear scope, experience the candidate may have left
off.

Before asking a question, check the facts file. Do not ask anything it already answers,
whether the answer was yes, no, or a detail; asking again tells the candidate the last answer
was thrown away. Ask only what is still open, and prefer questions whose answers will hold
for other postings too (the stack a system ran on, who owned a design, a concrete incident)
over ones that only matter for this role.

## Record the answers

When the candidate answers, save the answers to the facts file before anything else, then
re-run steps 4-8 with the new facts. Create the file if it does not exist. Also record any
fact about their experience that the candidate volunteers mid-conversation.

- One entry per fact, grouped under a heading per employer or project, plus a "General"
  heading. End each entry with the date it was stated.
- Write the fact as a statement that stands on its own, not as "yes" to a question the next
  run will not see. Keep the candidate's meaning and scope exactly: do not tidy "worked on"
  into "led", and keep their hedges ("starting with", "no project built with it yet").
- Record the "no" answers too ("Has not worked directly with product or client
  stakeholders"). They stop the question coming back.
- When a new answer contradicts an entry, replace the entry rather than keeping both, and
  tell the candidate which one you kept.
- If an answer is ambiguous or seems to answer a different question, record only what is
  certain and ask once to clear up the rest.

The file is plain Markdown the candidate can read and edit. It never goes in an application
folder and is never sent anywhere.

## Do not

- Send the resume or its contents to any service other than fetching the posting.
- Pad the resume to look more senior, or shrink it below what the candidate's level supports.
- Claim a requirement is met because the candidate "probably" did it.
- Overwrite the original resume.
- Ask a question the facts file already answers, or leave a new answer unrecorded.
- Stretch a facts-file entry past what the candidate said because it now has a row in the
  inventory.
- Invent a job title for the letter, or put the candidate's internal level in the letterhead.
