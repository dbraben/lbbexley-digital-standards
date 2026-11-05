---
name: improve
description: Works through the harness improvement ideas the end-of-run check logs in .lbbexley/improvements.md - applies the ones that belong to this service, and turns the ones for the Bexley standards into proposals for the Digital Team. Use when asked to improve the harness, when the session start says ideas are waiting, or at the end of a sprint.
---

# Improve the harness

The end-of-run check runs on a smaller model after each piece of work. As well as checking the work, it notes gaps in the harness itself: a mistake the standards check should have caught, a skill missing guidance, a template that needed changing, a rule that fired wrongly. Those ideas collect in `.lbbexley/improvements.md`. This is how they become improvements, with people deciding.

## Steps

1. Read `.lbbexley/improvements.md` and take the unticked ideas (`- [ ]`).
2. Merge duplicates. Drop ideas with weak evidence: tick them and add `(dropped: <why>)`.
3. Sort each idea into one of two groups.

**For this service only** (tests, `tests/accessibility/targets.json`, `AGENTS.md` decisions, local documents, a reasoned `.lbbexleyignore` entry):

- Apply it now. Plan first if it's more than a small edit.
- Tick it and add `(applied: <what changed>)`.

**For the Bexley standards** (skills, path rules, the standards check, templates, evals):

- Don't edit the synced copies here (`.github/skills/`, `.github/agents/lbbexley-*`, `.github/instructions/lbbexley-*`, `.claude/rules/lbbexley-*`, `.lbbexley/standards/`). The next sync overwrites them.
- Write a proposal for each: what happened, the suggested change, the evidence from this repository, and the area.
- If the GitHub CLI is available and the person agrees, create an issue in the standards repository: `gh issue create --repo dbraben/lbbexley-digital-standards --label harness-improvement --title "Harness idea: <short title>" --body-file <file>`. If the label is refused, run it again without `--label`: the title tells the Digital Team what it is. Otherwise give the person the text to paste into the "Harness improvement" issue form.
- Tick it and add `(proposed: <issue link or "text given">)`.

4. Tell the person what you applied, proposed and dropped. The updated `improvements.md` and any changes you applied are committed and pushed together once the end-of-run check passes<!-- claude-only --> and asks you to<!-- /claude-only --><!-- copilot: : offer **Check my work**, then **Commit the work** -->. Don't commit before that.

## Rules

- No personal data in proposals or issues.
- The Digital Team decides what changes in the standards. Their sign-offs in GOVERNANCE.md still apply, so a proposal is never a change by itself.
