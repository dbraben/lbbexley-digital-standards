---
name: triage-improvements
description: Triages the harness improvement ideas and false alarms that app repositories send to this repository - groups duplicates, checks each against a source, recommends a decision, and turns accepted ones into changes with tests. Use when a maintainer asks to triage improvements, review harness ideas or plan the next standards release.
disable-model-invocation: true
---

# Triage harness improvements

App repositories send ideas here from their end-of-run check, through `/lbbexley:improve`. A maintainer decides what changes. You prepare the decision and, once it's made, the change.

## 1. Gather

```bash
gh issue list --repo dbraben/lbbexley-digital-standards --state open --label harness-improvement --json number,title,body,url,createdAt --limit 100
gh issue list --repo dbraben/lbbexley-digital-standards --state open --label false-alarm --json number,title,body,url,createdAt --limit 100
```

If any issue contains what looks like real personal data, stop and tell the maintainer: it's a data breach (SECURITY.md). Don't quote it.

## 2. Group and assess

- Group duplicates. How many repositories raised the same thing is evidence.
- For each group, decide what kind of change it is:
  - **Mechanical** (a pattern in a file): a rule in `plugins/lbbexley/scripts/lib/checks.js`.
  - **Judgement** (wording, design, whether a duty applies): a skill, a path rule in `sync/rules/`, or a reviewer agent.
  - **Template**: the app template.
  - **False alarm**: reproduce it with a test first.
- Check each against its source (B:HIVE guide, WCAG, law or code paragraph). A standard with no source isn't added: say what source is needed.
- Note the sign-off GOVERNANCE.md needs for that area.

## 3. Recommend

Give the maintainer one table: issue, recommendation (accept, needs a source or sign-off, decline), the change, the sign-off, and the release type. A new rule that can fail existing builds is a minor version, and teams are told first. Wording changes are a patch.

Wait for the maintainer's decision before changing anything.

## 4. Make the accepted changes

- On a branch. Follow CONTRIBUTING.md: a test with a failing and a passing example for every rule, `npm run rules-doc` after changing rules, sources cited in skills.
- Run `npm run verify`, `claude plugin validate .` and `claude plugin validate plugins/lbbexley`.
- Draft a comment for each issue saying what was decided and why, linking the pull request. Never close an issue without one.
