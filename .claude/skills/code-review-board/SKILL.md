---
name: code-review-board
description: |
  Use when the user wants to review a pull request or a local branch of the Biblioteca-CirurgiaPlastica project before opening/merging. Dispatches 6 specialist reviewers (rag-integrity, cards-schema, pwa-frontend, image-assets, docs-memory, general-swe) in parallel, consolidates their findings with severity × confidence scoring, and produces a Markdown report at docs/reviews/ for the user to review before commit (the skill never auto-commits). It is the sole obligatory review gate for this project. Examples: "/code-review-board --pr 28", "code-review-board (no args = master..HEAD on current branch)".
---

# Code Review Board

Sole obligatory review gate for this repo. Dispatches 6 specialist reviewers in parallel, consolidates findings, writes a Markdown report for the human to review **before** `git add`.

**Announce at start:** "I'm using the code-review-board skill to review <target>."

## Reviewers

| Reviewer | Scope |
|---|---|
| rag-integrity-reviewer | `content/rag/**/*.md` |
| cards-schema-reviewer | `content/cards/**/*.json`, `content/cards/schema.json`, `content/cards/manifest.json`, `tools/rag_to_cards.js`, `tools/build_rag_index.js` |
| pwa-frontend-reviewer | `webapp/library/**/*.{js,html,css,json}`, `webapp/library/sw.js` |
| image-assets-reviewer | `assets/images/**`, `images[]` fields in any JSON under `content/cards/**` |
| docs-memory-reviewer | `CLAUDE.md`, `docs/superpowers/specs/**`, `docs/superpowers/plans/**`, `content/cards/manifest.json`, `content/rag/_structure.json`, `content/rag/_template.md` |
| general-swe-reviewer | Everything not covered above (tools/, node/python scripts, CI configs) — WITH anti-duplication rule |

## The 9 Steps

### Step 1 — Resolve target

Parse args:
- `--pr <N>`: use GitHub CLI.
  - `gh pr view <N> --json number,title,body,baseRefName,headRefName,files,commits > .crb-tmp/pr_<N>.json`
  - `gh pr diff <N> > .crb-tmp/pr_<N>.patch`
  - Derive filename: `PR-<N>-YYYY-MM-DD.md`
- No args: local branch vs master.
  - `git diff master...HEAD > .crb-tmp/branch.patch`
  - `git log master..HEAD --oneline > .crb-tmp/branch.log`
  - `git diff master...HEAD --name-only > .crb-tmp/branch.files`
  - Derive filename: `BRANCH-<slug>-YYYY-MM-DD.md` where slug = current branch with `/` → `-`.

Create `.crb-tmp/` if absent. Compute today's date (user's local date from env context).

### Step 2 — Build payload

Construct one Markdown string with these sections:

```
# Review target
- Kind: <pr|branch>
- Identifier: <PR #N | branch name>
- Base..Head: <base>..<head>
- Title: <title or branch name>
- Body: <PR body or "(local branch)">

# Files changed
<one path per line, from pr.files or branch.files>

# Diff
<inline if .patch is < 200KB; else: "See .crb-tmp/<file>.patch (too large to inline).">

# Recent commits
<git log one-liner list>

# Your review contract
- Scope (your paths): <INJECTED PER AGENT>
- Do NOT echo any literal PII/secret value in your findings.
- ALWAYS emit the `### FINDINGS ... ### END` block at the end, even if empty.
- If the diff is fully outside your scope, emit an empty block.
```

`<INJECTED PER AGENT>` is replaced for each reviewer (see the scope table above).

### Step 3 — Dispatch (parallel)

**GOTCHA #1 (critical):** Project agents in `.claude/agents/*.md` are **not** auto-discoverable as `subagent_type`. Only plugin agents are. So for each reviewer:

1. `Read .claude/agents/<reviewer>.md`.
2. Strip frontmatter: remove everything from the first `---` through the second `---` (inclusive). The remainder is the system prompt body.
3. Compose the agent prompt: `<body>\n\n---\n\n<payload with the agent's scope injected>`.
4. Emit **one single assistant message** with **N Agent tool calls in parallel**, each with `subagent_type: "general-purpose"` and the composed prompt.
5. Wait for all to return.

### Step 4 — Parse findings

For each reviewer response, extract the substring between the literal marker `### FINDINGS` and the literal marker `### END` (exclusive of both markers). Parse that as a YAML list of mappings with fields: `file`, `line`, `severity`, `confidence`, `category`, `headline`, `detail`.

If a reviewer omits the block: log a warning, treat as 0 findings. Do **not** fail the skill.

### Step 5 — Normalize and score

For each finding:
- `score = round(severity * confidence)`, clamped to `[0, 100]`.
- **Hallucination guard:** verify that `file` either exists on disk (`Read` succeeds) **or** appears in the changed-files list from Step 1. If neither, DROP the finding.
- Tag with `reviewer: <name>`.

### Step 6 — Dedupe

Key = `(file, line, category)`. Within duplicates, keep the one with the highest score. If other reviewers flagged the same key, append to the winner's `detail`:

```
(also flagged by: <other-reviewer-1>, <other-reviewer-2>)
```

### Step 7 — Bands and ordering

- `score >= 75` → **Blocker**
- `40 <= score < 75` → **Important**
- `score < 40` → **Suggestion**

Within each band, sort by score descending, ties broken by reviewer name.

### Step 8 — Render Markdown

Write `docs/reviews/<filename>.md` using this template:

```markdown
# Code Review Board — <identifier>  (<YYYY-MM-DD>)

**Title:** <title>
**Base..Head:** <base>..<head>
**Files changed:** <count>
**Total findings:** <blockers>+<important>+<suggestions>=<total>

## Blockers

<if none: "_No blockers._">
<else, per finding:>
<N>. **<headline>** — score <X>
   `<file>:<line>` · <category> · <reviewer>
   <detail>

## Important

<same structure>

## Suggestions

<same structure>

## Reviewers sem achados

<per reviewer with 0 findings:>
- <name>: scope matched <K> files · 0 findings

## Meta

Generated by `code-review-board` skill · <ISO timestamp> · 6 reviewers
```

### Step 9 — PII/secrets gate + deliver

Before confirming the write, scan the rendered report with Grep using these regex patterns (any match = abort):

- `\bAKIA[0-9A-Z]{16}\b` (AWS access key)
- `sk-[A-Za-z0-9]{20,}` (OpenAI/Anthropic-style key prefix)
- `ghp_[A-Za-z0-9]{36}` (GitHub PAT)
- `\b\d{3}\.\d{3}\.\d{3}-\d{2}\b` (CPF)
- `-----BEGIN [A-Z ]+ PRIVATE KEY-----` (PEM key)

If **any** regex matches: **delete the file** (`Bash rm <path>`) and abort with error message "PII/secret leaked into report — deleted. Re-run after fixing reviewers." Do not try to sanitize.

If clean, report to the user:

```
Report: <absolute path>
Blockers: <X>  Important: <Y>  Suggestions: <Z>

Report NOT committed. Review it before `git add`.
```

**The skill never runs `git add` or `git commit`.**

## Gotchas (ordered by likelihood of tripping)

1. **Dispatch:** use `subagent_type: "general-purpose"` with the agent body as the system prompt. Never pass the agent filename as `subagent_type`.
2. **YAML markers:** parser looks for **bare** `### FINDINGS` and `### END` — not wrapped in triple backticks. If you see the markers wrapped, the reviewer's prompt drifted; fix the reviewer file.
3. **Scratch dir:** use `.crb-tmp/` inside the repo (it's gitignored). Do **not** use `/tmp` — on Windows/git-bash it does not persist between Bash tool calls.
4. **Anti-duplication in general-SWE:** the rule is literal in that agent's prompt. If it ever duplicates a specialist's finding, check the prompt first — don't filter in the consolidator (too fragile).
5. **Hallucination guard:** always validate `file` exists (on disk OR in diff). LLMs invent paths under pressure.
6. **Never auto-commit:** load-bearing. If PII slips past Step 9, the human review is the last line of defense. Do not short-circuit.
