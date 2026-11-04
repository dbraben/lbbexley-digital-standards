# Changelog

All notable changes to the Bexley digital standards. Versions follow `major.minor.patch`: a new rule that can fail existing builds is a minor version at least.

## 0.5.0 – 4 November 2026

Fixes from a review of the workshop and the tests. There are no new rules, but two checks are stricter, so a build that passed with 0.4.0 can fail: the accessibility tests fail a page or screen they couldn't test, and the check on GitHub fails when `.claude/settings.json` or the Quality workflow names a different release from the synced files.

Accessibility tests:

- **Not tested isn't passed.** A target with `auth: true` fails when there's no saved sign-in, instead of being left out while the run passed, and fails when it lands on a sign-in page because the saved sign-in has expired. With `A11Y_BASE_URL` set, an empty `targets.json` fails. A workflow that can't sign in sets `A11Y_SKIP_SIGNED_IN=1`, and the targets that need a sign-in are reported as skipped instead. The report, and on GitHub the run's summary, says how many targets were run.
- **Signing in.** `npm run test:a11y:login` works out every address before it opens a browser. A path with no `A11Y_BASE_URL` gets a message with the PowerShell and Mac commands that set it. It also waits while the browser is on Power Pages' own sign-in page: before, it saved an empty sign-in straight away when a page sent the browser to `/SignIn`.

End-of-run check:

- **Deletions are reviewed and committed.** A file deleted in the run goes to the end-of-run review, marked "(deleted)", and the reviewer reports the deletion if it removes a test, a test target, a requirement or a check without a written reason. The commit includes the deletion. Before, deletions were left out of both. A deletion made before the session started is left alone.
- **A Copilot review isn't assumed.** Copilot doesn't tell the hooks whether lbbexley-check ran. When the agent stops again with nothing changed, the check now says the review isn't confirmed and to select **Check my work**, instead of recording the files as reviewed. It asks again after any later change.
- **Hook output for VS Code.** The Copilot hooks also give their answer in the `hookSpecificOutput` form that VS Code's hooks reference describes, as well as the form the Copilot CLI documents.

Claude Code plugin:

- **Pinned to the release.** The template's `.claude/settings.json` installs the plugin from the release (`"ref": "v0.5.0"`) instead of the standards repository's default branch, so Claude Code uses the same standards as Copilot and the check on GitHub. `npm run standards:update` moves this pin with the others, then moves the installed plugin to the release (`claude plugin marketplace add dbraben/lbbexley-digital-standards#<release> --scope project`, then `claude plugin update lbbexley@lbbexley-digital`). If it can't, it gives the two commands to type, with `--scope local` so they don't rewrite `.claude/settings.json`. Updating the marketplace on its own doesn't move the plugin to a new release.
- **Updating from 0.4.0.** Run `npm run standards:update -- v0.5.0` twice. The first run brings in the new updater, and says the marketplace isn't pinned; the second pins it and moves the plugin.
- **One release everywhere.** The sync check, which the check on GitHub runs, fails when `.claude/settings.json` or `.github/workflows/quality.yml` names a release other than the synced files' (a commit SHA in the workflow is allowed). In a repository made from an older template, the sync says how to add the pin.
- **Pre-election periods** added in a patch release reach Claude Code's session reminder when a service updates to that release, as they already did for Copilot. The check on GitHub still reads them from `main`, so it warns straight away.

Planning: when there's no `docs/architecture.md`, Copilot's lbbexley-plan offers the architect skill, but plans from the requirements if the person wants to, as in the workshop's short session.

Template:

- `docs/compliance/README.md` no longer fails the release check: it describes the placeholders in words instead of showing one.
- The Quality workflow passes `A11Y_SKIP_SIGNED_IN` to the accessibility tests. `tests/accessibility/targets.json` says to give a full address or set `A11Y_BASE_URL` before signing in, and to give every target that needs a sign-in a `waitFor`.

Docs: the onboarding, setup and maintaining guides have the new plugin commands, the Dataverse MCP server on a Mac or Linux (`claude mcp add --scope local`), and `A11Y_SKIP_SIGNED_IN`.

## 0.4.0 – 4 November 2026

The requirements are a conversation in the chat, and the assistant commits the work, so nobody has to write files in the repository or run Git. Nothing in this release can fail a build that passed with 0.3.2.

Requirements:

- **Asked in the chat.** `/lbbexley:requirements` starts from what it already knows, then offers two ways to carry on: answer two or three questions at a time in the chat, or take the questions away as a table to fill in with the service team. The table's first line, "Bexley requirements answers · <service name> · questions of <date>", tells the skill what it is when it's pasted back, in any session, and it carries on from there. The draft requirements, with the questions still open, are written before the table is given, so nothing is lost in between. The table is also saved in `docs/discovery/requirements-questions.md`, which Git ignores, for anyone who finds it easier to copy from a file.
- **No files to write.** The requirement prompt template (`requirement-prompt.md`) and its example are gone. The questions are in the skill's `questions.md`, and the person answers them in the chat. Cleaned Teams transcripts in `docs/discovery/` still work, and are optional.
- **Checked in the chat.** The skill shows a summary of the users, stories and open questions in the chat, makes the changes asked for, and offers the summary as text to send to the service owner. Answers given in the chat get the same personal data check as files.
- **Issues only when asked.** The requirements skill drafts GitHub issues only if the person asks, and the plan skill names a story's issue only if it has one.

Committing the work:

- **The assistant commits.** In Claude Code, once everything a run changed passes the standards check and the review, the end-of-run check asks Claude to commit it on the current branch with a short message, once for each request from the person. It lists the files, and never includes original transcripts, roles files, secrets, saved sign-ins, `docs/discovery/` or the harness's own state. It says not to make a branch, push or open a pull request unless the person asked. The commit comes after the review, because the review reads the uncommitted changes.
- **In Copilot**, lbbexley-check offers **Commit the work** when it finds nothing outstanding, and lbbexley-plan offers **Check my work** for the requirements and the design. lbbexley-check now reads what changed from Git, the uncommitted changes, rather than from the last review request, which could be out of date. **Fix what the check found** sends its prompt straight away, and lbbexley-build runs the standards check again before it commits.
- **Skills don't commit early.** The new-app, requirements, architect and improve skills leave the commit until the check is clean. The template's `AGENTS.md` says the same ("Save"), and its settings let Claude run `git add` and `git commit` without asking. `git push` still asks.
- **Problems the assistant explained are the person's call.** When the assistant explains a reviewer's problem instead of fixing it, the check tells the person once, and then lets it go: it isn't held against the work again unless a later review reports it again, and the work can be committed. Before, the check held the assistant back once more at the end of every request in the session.
- **Template.** `.gitignore` ignores `*.vtt` and `*.roles.json`, so an original transcript put in the repository by mistake is never committed. The README and CONTRIBUTING describe saving and sharing without branches; branches and pull requests are there for teams who want them.

Review:

- **Screens with nothing to open yet.** The end-of-run reviewer no longer reports a screen built as source only, with no app in an environment yet, as missing from `tests/accessibility/targets.json`.
- **Discovery material.** Files in `docs/discovery/` still get the standards check, including for personal data, but not the end-of-run review: they're never committed.
- **Work on `main`.** `/lbbexley:review` reviews the whole service when the work is on `main`, as it is when the assistant commits for you. On any other branch it still reviews what changed on the branch.

Transcript cleaner: its message says that Git ignores `docs/discovery/`, but that approved AI tools may still read it.

Docs: the README, the onboarding guide and the setup guide describe the conversation, committing and sharing. GOVERNANCE.md adds the risk of work without peer review, and an open decision on peer review before go-live.

## 0.3.2 – 4 November 2026

The review checks only what's been built. Nothing in this release can fail a build that passed with 0.3.1.

- **Review.** `/lbbexley:review` sorts the changed files into what people use (anything under `src/`) and documents. When only documents have changed, it says nothing has been built yet, skips the accessibility tests and the accessibility reviewer, and reports them as not applicable rather than as a gap. Before, it ran the screen checks on a branch that held only the set-up and the requirements. A screen or page that has been built but isn't in `tests/accessibility/targets.json` is still reported as a gap.
- **End-of-run review.** For changes that are documents only, the reviewer checks content, data and the duties, and skips the screen and page checks.

## 0.3.1 – 4 November 2026

Fixes from the first workshop runs. The end-of-run check no longer asks for the same review again and again, and the set-up and the requirements reuse what the person has already said. Nothing in this release can fail a build that passed with 0.3.0.

End-of-run check:

- **Files changed by a command.** The review request records the exact files and content it sends, including files changed by a command, an MCP tool or by hand. When the review reports, those files are marked as reviewed, so the check doesn't ask again; a file changed after the request is reviewed again. Before, only files saved with the assistant's edit tools were marked, so the check asked for a review of the others at the end of every turn, until it gave up with "the end-of-run review didn't run".
- **Reviews in the background.** Claude Code now runs subagents in the background, so the assistant's turn ends while the review is still running. The check waits for it instead of asking again, using the list of running tasks Claude Code gives the hook, or the time the review started. The review's report starts a turn of its own, and the check runs again at the end of it. A review that never reports is asked for again after 15 minutes.
- **An unreadable report is never a pass.** If the reviewer's report can't be read, no file is marked reviewed, earlier findings stay open, and the check asks for the review again. It never reports "passed".
- **Review limit.** The review runs at most five times for each request from the person, not each turn, because a background review's report starts a turn of its own. The prompt guard notes when the person sends a message.
- **Messages.** The request for a review says to start it once and end the turn. When the check gives up, it names the files that weren't reviewed.

Set-up, requirements and design:

- **Intake reuses what's already known.** `new-app` records what the person has said in `docs/discovery/service-introduction.md`, and accepts "not decided yet" and "no environment yet". `requirements` reads `AGENTS.md`, `docs/discovery/` and any existing `docs/requirements.md` first, asks only about gaps, keeps story IDs stable on a re-run, and keeps "draft" separate from "agreed by" the service owner.
- **Where the requirements are.** The requirements skill tells the person where `docs/requirements.md` is: in their repository on their computer, on the current branch, and not on GitHub until they push it. In plan mode, it says the plan is the draft, saved when they approve it.
- **Post-design reconciliation.** The architect skill has a step that brings the plugins, compliance documents, accessibility targets, agent tests, environment settings and "Built with" into line with the design.

Docs:

- **Updating the plugin.** The onboarding guide and `npm run standards:update` give the two commands that update the Claude Code plugin: `claude plugin marketplace update lbbexley-digital`, then `claude plugin update lbbexley@lbbexley-digital`. Updating the marketplace on its own doesn't update the plugin. The onboarding guide also explains the end-of-run check's "Stop hook error" label.


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
