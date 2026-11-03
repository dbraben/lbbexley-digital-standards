---
name: review
description: The Bexley definition of done before a pull request - runs the standards check and the accessibility tests, has the accessibility and compliance reviewers check what tools can't, checks the compliance documents, and reports what passes, what to fix and what needs a person to test. Use before opening a pull request, before calling a feature finished, or when asked to review work against Bexley standards.
argument-hint: "[files or folders to review]"
allowed-tools: Bash(node *lbbexley-check.js*), Bash(npm run check*), Bash(npm run test:a11y*)
---

# Review against Bexley standards

The end-of-run check already runs after every piece of work. This is the fuller review before a pull request. The definition of done is **zero findings of any severity**: warnings are fixed too, or suppressed with a written reason.

## 1. Decide what to review

Use the paths given ($ARGUMENTS) if there are any. Otherwise review what has changed on this branch: `git diff --name-only main...HEAD` plus uncommitted changes from `git status --short`. If it isn't a git repository, review `src/` and `docs/`.

## 2. Run the automated checks

<!-- claude-only -->
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/lbbexley-check.js" --root . --changed main
```
<!-- /claude-only -->
<!-- copilot: Run `npm run check -- main` (the same standards check, vendored in `.lbbexley/standards/`). -->

Then run `npm run test:a11y` if the change affects anything people see. If the tests can't run (no saved sign-in, or no targets yet), say so in the report: that's a gap to close, not a pass.

Fix every finding before going further.

## 3. Review what tools can't check

<!-- claude-only -->
Hand the files to both reviewer agents at the same time, and give each the list of paths:

- `lbbexley:accessibility-reviewer`: WCAG 2.2 AA and the Bexley accessibility rules
- `lbbexley:compliance-reviewer`: content style, brand, data protection, publicity, equality and AI transparency

While they work, check the compliance documents (step 4).
<!-- /claude-only -->
<!-- copilot: Go through the [review] items in checklist.md yourself, file by file, and note the file and line for each problem. -->

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

Lead with the result, then a table:

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

Then list:

1. **Must fix**: every problem, with file and line, most serious first. Nothing is too minor to list.
2. **Needs a person**: tests a tool can't do, such as screen reader and keyboard journeys, testing with disabled users, and sign-offs from Information Governance or Communications.

Never say a build "is accessible" or "complies with WCAG" on the strength of this review. Say what was checked and what still needs testing by people. Offer to fix the must-fix items.
