# Changelog

All notable changes to the Bexley digital standards. Versions follow `major.minor.patch`: a new rule that can fail existing builds is a minor version at least.

## Unreleased

Setup and review fixes from a workshop walkthrough. Nothing here changes what passes a build.

- **Review cannot pass on an unreadable report.** If the end-of-run reviewer's report can't be read, no file is marked reviewed, earlier findings stay open, and the stop gate asks for the review again. It never reports "passed".
- **No repeat reviews.** The review request records the exact files and content hashes sent. Those files are marked reviewed when the review completes, so a file created through a terminal command isn't requested again after a clean review. A file changed after the request is reviewed again.
- **Intake reuses what's already known.** `new-app` records what the person has said in `docs/discovery/service-introduction.md` and accepts "not decided yet" and "no environment yet". `requirements` reads `AGENTS.md`, `docs/discovery/` and any existing `docs/requirements.md` first, asks only about gaps, keeps story IDs stable on a re-run, and keeps "draft" separate from "agreed by" the service owner.
- **Post-design reconciliation.** The architect skill has a step that brings plugins, compliance documents, accessibility targets, agent tests, environment settings and "Built with" into line with the design.

## 0.3.0 – 3 November 2026

Start from your own project. Nothing in this release can fail a build that passed with 0.2.2.

- **Requirements from your own words.** New `requirements` skill (`/lbbexley:requirements`, on Opus): turns a cleaned meeting transcript, discovery notes or the person's own requirement prompt into `docs/requirements.md`, with users and their needs, user stories with priorities and acceptance criteria, rules, data, the duties that apply, what's out of scope and open questions. It checks the material for personal data before anything else, never invents answers, and drafts GitHub issues from the stories when asked. A requirement prompt template comes with it.
- **Transcript cleaner.** `npm run transcript:clean -- <transcript>` makes a copy of a Teams meeting transcript (.vtt, .docx or text) that's safe to use for requirements: speakers named by role, email addresses, phone numbers, full postcodes and reference numbers removed, and names kept in a roles file next to the original, outside the repository. It never prints names, refuses an original that's inside the repository, won't overwrite a copy someone has edited, and only writes to `docs/discovery/`, which Git ignores.
- **Data protection.** The data-protection skill covers recording discovery meetings and cleaning transcripts (`transcripts.md`). GOVERNANCE.md records the risk and an open decision for Information Governance.
- **Architect, plan and new-app** start from `docs/requirements.md` when it exists, and Copilot's plan agent can write it.
- **Examples.** The skills, agents, evals and tests no longer share one fictional service, so nothing reads as a set scenario. Examples are short and labelled as examples.
- **Sync.** Links from one skill to another now work in Copilot's copies. For repositories made from an older template, the sync lists the `transcript:clean` script and the `docs/discovery/` files to add.
- **Logo.** The council logo (`bexley-logo.png`) is in the brand skill's assets, so it's synced into every service repository. The SVG and the clear-space rules are still to come from Communications.
- **Pull request check.** The pre-election step runs its script from a heredoc, so shellcheck has nothing to report. It behaves the same.
- **App template.** `docs/discovery/` with a README and a `.gitignore` that keeps everything but the README out of Git, the `transcript:clean` script, Claude Code denied the cleaner, `.vtt` files and roles files, and examples in `targets.json` with no service built in.

## 0.2.2 – 2 November 2026

- **Accessibility fix in the canvas screen pattern.** The footer's "Accessibility statement" link turned #2B8CC4 on hover, which is 3.32:1 on the footer's grey, below the 4.5:1 minimum. It now stays #005EA5 (5.97:1). Screens built from the pattern should make the same change.
- **The standards check looks through transparent backgrounds.** When a control's Fill, HoverFill or PressedFill is transparent, or a label has no Fill, its text is checked against the nearest container's fill, or the screen's. It never guesses: if that fill isn't a Bexley token, the pair isn't checked. This can find contrast failures that 0.2.1 missed.
- **Link hover colour.** The brand skill, the canvas tokens table and `tokens.css` now keep #005EA5 on hover for normal-size text, with a thicker underline on the web; #2B8CC4 is for large text only. Recorded as an open decision for the Digital Team and Communications in GOVERNANCE.md.
- **Onboarding.** The plugin's reminder at the start of a session goes to the assistant, not the developer, so the guide now says to check `/plugin` instead.
- **Documentation.** The README is now the front page for developers: what the harness does, where things live, and how to create your own repository from the template. Publishing the harness and running the pilot moved to `docs/setup.md`.

## 0.2.1 – 2 November 2026

- The accessibility test runner (Playwright and axe) now comes from the standards. Its source is `sync/tests/accessibility/`, and the sync copies it to `.lbbexley/standards/tests/accessibility/` in each app repository, so `npm run standards:update` updates it with every release. Each service keeps its own list of pages and screens in `tests/accessibility/targets.json`.
- App repositories made from an earlier template: the sync lists the two `package.json` scripts to change and the old copies to delete.

## 0.2.0 – 31 October 2026

Plan, build, check, and zero findings of any severity. **This release can fail builds that passed with 0.1.0**: warnings now fail the pull request check, and there are 20 new rules. Tell teams before they update.

Plan, build, check:

- Claude Code: the app template uses `opusplan` and starts in plan mode, so Opus plans and Sonnet builds. New `architect` and `plan` skills run on Opus. Plans are saved in `docs/plans/`.
- End-of-run check: a Stop hook keeps the assistant working until every file it changed passes the standards check, then asks the new `end-of-run-reviewer` agent (Haiku) to review the changes. Problems it reports are held open until the file changes. It stops and tells the person what's outstanding when standards problems survive three attempts, when the assistant explains a reviewer's problem rather than fixing it, or after five reviews in one request.
- Self-improvement: the reviewer also suggests improvements to the harness. They're logged in `.lbbexley/improvements.md`, and the new `improve` skill applies the local ones and turns the rest into proposals for this repository (the new "Harness improvement" issue form).
- GitHub Copilot: `lbbexley-plan`, `lbbexley-build` and `lbbexley-check` agents with handoffs between them and model preference lists (`copilotModels` in the config), and Copilot hooks (preview) running the same guardrails and end-of-run gate.

Zero findings:

- Every finding, at any severity, goes back to the assistant after each save. The pull request check and `npm run check` fail on warnings by default.
- New rules: canvas keyboard order, visible focus, target size, text contrast (with Bexley tokens and ColorFade resolved), headings, text size and disabled buttons; Power Pages page titles, input labels, empty links, positive tabindex, autoplay, disabled zoom and heading order; CSS contrast and hidden focus; adaptive card images; emoji; suppressions without a reason; and, with `--release`, incomplete compliance documents. `html-lang` is now an error.
- Suppressions need a written reason, in the file (`lbbexley-ignore: <rule> <reason>`) or in `.lbbexleyignore`. Personal-data findings can only be suppressed line by line.
- The review skill's rules document is generated from the checker, so it can't drift.

Accessibility testing:

- The app template has Playwright and axe-core tests for every page and screen listed in `tests/accessibility/targets.json`: zero axe violations at WCAG 2.2 AA, reflow at 320 pixels and visible focus for Power Pages, and canvas apps tested inside their frame. A saved sign-in (`npm run test:a11y:login`) covers pages behind sign-in. They run in the Quality workflow when `A11Y_BASE_URL` is set.

Structure, adopted from the web development repository the team reviewed and Microsoft's Power Platform architect plugin:

- Path rules for canvas apps, Power Pages, agents, flows, Dataverse, compliance documents, plans and tests, written once in `sync/rules/` and synced to `.claude/rules/` and `.github/instructions/`.
- A `quality-checks` skill listing every check and when to run it.
- One sync for app repositories (`scripts/sync-app.js`, replacing `sync-copilot.js`) that also copies the standards scripts into `.lbbexley/standards/`, so `npm run check` and the Copilot hooks use the same rules. `npm run standards:update -- <version>` updates an app repository in one step, and the pull request check now fails when the synced files differ from the release.
- App template: Quality workflow with parallel jobs, `copilot-setup-steps.yml`, Dependabot with a cooldown, a dev container, issue forms (feature, bug, accessibility problem), CONTRIBUTING.md.
- This repository: CONTRIBUTING.md, SECURITY.md, SUPPORT.md, issue forms for harness improvements and false alarms, Dependabot, and a `/triage-improvements` skill for maintainers.

## 0.1.0 – 30 October 2026

First version, for the pilot.

- Skills: brand, accessibility, content style, publicity, data protection, equality, AI transparency, canvas apps, Power Pages, Copilot Studio, Power Automate, Dataverse and model-driven apps, review, new app.
- Reviewer agents for accessibility and compliance.
- Guardrails: session reminder and pre-election warning, personal-data prompt guard, Dataverse guard, standards check after each save.
- Standards check with rules for colours, fonts, accessible labels, alt text, personal data, placeholder text, emoji, tracking scripts, Google Fonts, environment URLs, flow error handling, hard-coded mailboxes and solution publishers.
- Reusable pull request workflow and Copilot sync.
- Eval cases for canvas labels, error messages, agent instructions and test data.
