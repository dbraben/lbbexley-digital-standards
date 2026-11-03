# Bexley digital standards repository

This repository is the Claude Code marketplace and plugin (`lbbexley`) that holds the London Borough of Bexley's standards for Power Platform builds, and the sync that brings app repositories in line with each release. It isn't an app.

- Skills are written in plain British English for council developers. Keep `SKILL.md` files short and put detail in linked supporting files.
- Every standard cites its source (B:HIVE guide, law or code paragraph). Don't add rules without one; flag gaps instead.
- Mark Claude-only passages with `<!-- claude-only -->` blocks and give Copilot alternatives with `<!-- copilot: ... -->` (see docs/maintaining.md).
- The standards check is in `plugins/lbbexley/scripts/lib/checks.js`. Every rule has a test in `tests/checks.test.js`, and `npm run rules-doc` regenerates the rules document after a rule changes.
- Path rules live once in `sync/rules/`; the sync writes them for both Claude Code and Copilot. Copilot's plan, build and check agents and hooks are in `sync/copilot/`, and the accessibility test runner is in `sync/tests/accessibility/`.
- Harness ideas from app repositories arrive as issues labelled `harness-improvement`. `/triage-improvements` prepares decisions; maintainers make them.
- Before finishing a change: `npm run verify`, `claude plugin validate .` and `claude plugin validate plugins/lbbexley`.
- Releases bump the version in both manifests and `package.json`, and add a CHANGELOG entry.
- Tests generate real-looking identifiers at run time. Never commit real personal data, even in tests.
- The transcript cleaner (`scripts/clean-transcript.js`) must never print a name or write one inside the repository: names stay in the roles file next to the original.
- Examples in skills are short and labelled as examples. Don't build them around one fictional service.
