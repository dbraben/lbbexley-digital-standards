---
name: review
description: The Bexley definition of done for a story - runs the standards check, and the accessibility tests when something people use has changed; has the compliance reviewer, and the accessibility reviewer for anything people use, check what tools can't; checks the compliance documents; and reports what passes, what to fix and what needs a person to test. Use before calling a story or feature finished, before sharing the work or opening a pull request, or when asked to review work against Bexley standards.
argument-hint: "[files or folders to review]"
allowed-tools: Bash(node *lbbexley-check.js*), Bash(npm run check*), Bash(npm run test:a11y*)
---

# Review against Bexley standards

The end-of-run check already runs after every piece of work. This is the fuller review before a story is done, or before the work is shared. The definition of done is **zero findings of any severity**: warnings are fixed too, or suppressed with a written reason.

## 1. Decide what to review

Use the paths given ($ARGUMENTS) if there are any. Otherwise:

- **On a branch other than `main`:** review what has changed on it: `git diff --name-only main...HEAD` plus uncommitted changes.
- **On `main`**, where people who don't use branches do all their work, or if that finds nothing, or if it isn't a git repository: review the whole service: `src/`, `docs/`, `tests/`, `AGENTS.md` and `README.md`.

`git status --short --branch` shows the branch on its first line, then the uncommitted changes.

Then sort the files, because they need different checks:

- **What people use**: anything under `src/`, such as canvas app screens, Power Pages templates and CSS, agent topics, and flows and the emails they send.
- **Documents**: everything else, such as `docs/requirements.md`, `docs/architecture.md`, `docs/plans/`, `docs/compliance/`, `AGENTS.md` and `README.md`.

If none of the files is something people use, nothing has been built for this change yet. Say so at the start, and review the documents only: skip the accessibility tests and the accessibility review, and report them as not applicable, not as a gap.

## 2. Run the automated checks

<!-- claude-only -->
For a branch:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/lbbexley-check.js" --root . --changed main
```

For the whole service:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/lbbexley-check.js" --root .
```
<!-- /claude-only -->
<!-- copilot: Run `npm run check -- main` for a branch, or `npm run check:all` for the whole service (the same standards check, vendored in `.lbbexley/standards/`). -->

When the change includes something people use, run `npm run test:a11y`. If the tests can't run, or a screen or page that changed isn't in `tests/accessibility/targets.json`, say so in the report: that's a gap to close, not a pass. Don't run them for documents only.

Fix every finding before going further.

## 3. Review what tools can't check

<!-- claude-only -->
Hand the files to the reviewer agents, and give each the list of paths:

- `lbbexley:compliance-reviewer`, always: content style, brand, data protection, publicity, equality and AI transparency
- `lbbexley:accessibility-reviewer`, only when the change includes something people use: WCAG 2.2 AA and the Bexley accessibility rules

When both apply, run them at the same time. While they work, check the compliance documents (step 4).
<!-- /claude-only -->
<!-- copilot: Go through the [review] items in checklist.md yourself, file by file, and note the file and line for each problem. For documents only, skip the items about screens and pages. -->

The full list of what to check is in [checklist.md](checklist.md). The rules the standards check applies are listed in [rules.md](rules.md).

## 4. Check the compliance documents

In `docs/compliance/`, confirm each document that applies to this build exists and is up to date:

| Document | Needed when |
|---|---|
| `accessibility-statement.md` | Always |
| `dpia-screening.md` | Any personal data |
| `equality-impact.md` | New service, or a change in who can use it or how |
| `publicity-check.md` | Anything residents, businesses or partners see |
| `atrs-record.md` | AI or algorithmic tools that affect the public |
| `retention.md` | Any records kept |

Before go-live, `npm run check:release` must pass: no `{{...}}` placeholders left.

## 5. Report

Lead with the result. If only documents changed, say first that nothing has been built yet, so the review covered the documents. Then a table of the areas that apply:

| Area | Result | Details |
|---|---|---|
| Standards check | Pass / Fix | counts, and every finding |
| Accessibility tests | Pass / Fix / Not run | |
| Accessibility review | Pass / Fix / Needs a person | |
| Content style | | |
| Brand | | |
| Data protection | | |
| Publicity | | |
| Equality | | |
| AI transparency | | (or "Not applicable") |
| Compliance documents | | missing or incomplete ones |

Leave out the areas that don't apply, and name them in one line under the table, for example: "Not applicable: accessibility tests and accessibility review (nothing built yet), AI transparency (no AI)."

Then list:

1. **Must fix**: every problem, with file and line, most serious first. Nothing is too minor to list.
2. **Needs a person**: tests a tool can't do, such as screen reader and keyboard journeys, testing with disabled users, and sign-offs from Information Governance or Communications.

Never say a build "is accessible" or "complies with WCAG" on the strength of this review. Say what was checked and what still needs testing by people. Offer to fix the must-fix items.
