# Changelog

All notable changes to the Bexley digital standards. Versions follow `major.minor.patch`: a new rule that can fail existing builds is a minor version at least.

## 0.6.1 – 5 November 2026

Fixes from an end-to-end review of 0.6.0. There are no new rules, but two things change what a run does: flows and tables are added to the solution before the sync, and the end-of-run check now confirms the work was committed and pushed. A repository on 0.6.0 needs the changes under "Updating from 0.6.0".

Building in the dev environment:

- **Flows and tables go into the solution.** Microsoft's Power Automate tools create flows outside the service's solution, and the Dataverse MCP server does the same for tables, so `pac solution sync` never saw them and the repository didn't get them. Now the assistant adds each new one with `pac solution add-solution-component` before the sync (the flow's `workflowId` from `get_flow_context`, or the table's logical name), the end-of-run check says so when a flow or table changed, and the sync skill checks. The template allows the command, the pac guard covers it, and the new-app skill tells the person to set the service's solution as their preferred solution in Power Apps. The dataverse skill says what to do when a table arrives with another publisher's prefix.
- **Committed and pushed, or you're told.** After the end-of-run check asks for the commit, it checks the next time the assistant stops: if the work still isn't committed it asks once more, then tells the person what's unsaved instead of saying the check passed. The same for the push: a branch that's ahead of its remote, or has never been pushed, gets one request to push (with `git push -u origin <branch>` for a new branch), then the person is told.
- **The reviewer knows whether `src/solution` was synced.** The review request says whether `pac solution sync` ran in the session, so synced files are reviewed as the latest version and changes without a sync are reported as hand edits.
- The end-of-run check names the solution's project folder, `src/solution/<solution>/`, and gives the clone command with the solution name from `AGENTS.md`.

Guardrails:

- **A pac command that names another environment is blocked.** `pac solution sync --environment …` and `pac pages upload -env …` were let through when pac itself was signed in to the dev environment. Now the named environment must be the dev one; an environment ID or name, which can't be checked, asks the person.
- **Where pac is connected is read carefully.** The guard uses `pac env who --json`, then the "Org URL" line, and never takes a sign-in address for the environment. Its message says `pac env select` rather than the deprecated `pac org select`.
- **`smoke_test` is blocked.** It creates, runs and then deletes a flow.
- **Tool names from other hosts.** The Power Automate guard and the change tracking match the operation at the end of the tool name, so a host that joins the parts with single underscores (`mcp_flowagent_delete_flow`) is covered as well as `mcp__…__delete_flow` and `flowagent/delete_flow`.

Template:

- `.claude/settings.json` turns off the usage telemetry Microsoft's Power Automate, Power Pages and Model Apps plugins send to Microsoft by default (`POWER_PLATFORM_SKILLS_TELEMETRY_<PLUGIN>_OPTOUT`), sets `attribution.sessionUrl` to `false` so a commit made from a Remote Control or cloud session carries no session link, and allows `pac solution add-solution-component`. `.vscode/settings.json` allows it too.
- `.github/copilot-instructions.md` describes the 0.6 way of working: it still described 0.4.
- `.github/dependabot.yml` ignores the standards repository, so Dependabot no longer offers to move the check on GitHub to a release the rest of the repository isn't on, which the sync check would fail.
- The dev container installs the Azure CLI, which flows need.
- `AGENTS.md`, `src/README.md` and `CLAUDE.md` have the add-to-solution step and the solution folder.

Docs and workshop: GOVERNANCE.md records the telemetry Microsoft's plugins send and the decision it needs. The onboarding guide has the preferred solution, the telemetry opt-out for Copilot users and a troubleshooting row for a flow or table missing after a sync. Workshop exercise 01 no longer refers to an `ask` list, the instructions README has the steps in the right order, and exercise 09 has the preferred solution and the add-to-solution step.

Updating from 0.6.0:

1. Run `npm run standards:update -- v0.6.1`.
2. Make the changes it lists, copying from the app template: `.claude/settings.json` (the add-solution-component rule, the `env` block and `attribution.sessionUrl`), `.vscode/settings.json`, `.github/copilot-instructions.md`, `.github/dependabot.yml` and the "How work runs" section of `AGENTS.md`.
3. Each developer sets the service's solution as their preferred solution in Power Apps. Any flow or table built with 0.6.0 that isn't in the solution: add it with `pac solution add-solution-component`, then run `/lbbexley:sync`.

## 0.6.0 – 5 November 2026

One way of working: everything is built in the dev environment, never as files on their own, and the repository keeps the guidelines and the latest version. The assistant changes the dev environment without asking, brings the latest version into the repository, has it reviewed, then commits it and pushes it to GitHub. This changes how every service works. There are no new rules in the standards check, but a run that changed the dev environment can't finish until the latest version is in the repository, Dataverse changes no longer ask, and the work is pushed without asking. A repository updated from 0.5.0 needs the changes under "Updating from 0.5.0".

Building in the dev environment:

- **Built with Microsoft's tools.** The assistant builds directly in the dev environment named in `AGENTS.md`: a canvas app with Microsoft's canvas-apps plugin, working in `src/canvas/<app name>/` and compiling into the app open in Power Apps Studio; flows with Microsoft's Power Automate plugin; tables and columns with the Dataverse MCP server; a Power Pages site with `pac pages upload`. Building screens or flows as files on their own is no longer a route, and the end-of-run reviewer no longer accepts it. Copilot Studio agents are unchanged: edited in `src/agent/` and applied with the Copilot Studio extension.
- **The latest version comes into the repository.** A new hook notes each change the assistant makes to what the solution holds in the dev environment: a canvas app, a flow, a table or column, or the Power Pages site. Made-up records aren't in the solution, so they don't need a sync. Before the run can finish, the end-of-run check asks for `pac solution sync` into `src/solution` (cloning the solution there first if it isn't there), and for a canvas app's working folder outside `src/canvas/` to be moved there. Then it reviews what came in, so what's reviewed and committed is what's in the dev environment. If the sync hasn't happened after three requests, the check lets the run finish and tells the person what isn't in the repository yet.
- **`/lbbexley:sync`** (in Copilot, the lbbexley-sync skill) brings the latest version in after someone changes the dev environment themselves, in Power Apps Studio, the flow designer or the app designer.
- **Committed and pushed.** When the check is clean, the assistant commits the latest version on the current branch, pushes it to GitHub and tells the person. If the push fails, for example because `main` is protected, it says why. A repository with no remote is committed only. It still doesn't make branches or open pull requests unless the person asks.
- **The reviewer** reports hand edits to `src/solution`, and canvas app source changed in the run but not compiled into the app.

Guardrails, in both assistants:

- **Dataverse.** Reading and changing tables, columns and records goes ahead without asking: the Dataverse MCP server points only at the dev environment, which holds fictional data only. Deletes are still blocked.
- **Power Automate** (new). Deleting a flow or a connection, and copying a flow, are blocked. Running a flow, resubmitting a run or calling a connector asks the person first, because it can send real emails or messages. So do changing the environment or the account, and restoring a backup. Building, editing, publishing and turning off flows go ahead.
- **pac** (new). `pac pages upload` and `download`, and `pac solution sync` and `clone`, run only when pac is connected to the dev environment in `AGENTS.md`. Otherwise they're blocked, with the command to switch. If `AGENTS.md` doesn't name a dev environment yet, or pac can't say where it's connected, the person is asked.
- **Pushes** (new). A push that could overwrite or delete work on GitHub, such as a force push, a delete, or a mirror or prune push, is blocked. A push to anywhere other than one of the repository's own remotes asks the person first.

Standards check: `config/standards.json` has `ignorePatterns`, paths the check and the end-of-run review leave alone. It lists the planning notes Microsoft's canvas tools write next to each app (`src/canvas/<app name>/*.md`).

Skills and agents:

- The plan skill says where each change is built, in place of "Files to change". The canvas-apps, power-automate, dataverse, power-pages, copilot-studio and quality-checks skills describe building in the dev environment.
- `/lbbexley:new-app` turns on Microsoft's Power Automate plugin for a service with flows, and says what to set up: the solution, the pac sign-in, the Azure CLI for flows, and coauthoring for a canvas app. The new-app, requirements, architect and improve skills commit and push once the check is clean.
- In Copilot, lbbexley-build builds in the dev environment, syncs, commits and pushes, and lbbexley-check's **Commit the work** pushes too.

Template:

- `.claude/settings.json` lets Claude use the Dataverse, canvas and Power Automate tools, check where pac is connected, sync and clone the solution, download and upload the Power Pages site, push, and clear the canvas tools' notes with `git clean -fX src/canvas/...`, without asking. `git push` and `pac pages upload` no longer ask. Force pushes, deletes and mirror pushes are denied.
- `.vscode/settings.json` lets Copilot run the standards check, the commit, the push and the pac commands in the terminal without asking, but not a force push or a delete.
- `AGENTS.md`: "How work runs: plan, build in the dev environment, check", a rule to keep the latest version under `src/`, and new "Never" items: editing `src/solution` by hand, deleting or copying flows, deleting connections, and force pushes. The tables have the `src/` layout and the sync.
- `.gitignore` ignores `src/canvas/**/*.md`. The README, CONTRIBUTING, `CLAUDE.md` and `src/README.md` describe the new way of working.

Workshop: rewritten for building in a dev environment from exercise 08 on. Exercise 09 sets up the dev environment once, then builds each kind of resource in it; exercise 10 checks it there, and exercise 11 on GitHub. Exercises 00 to 07 still work without a dev environment. The facilitator guide has a dev environment for each person, the checks to make the day before, and new common problems.

Docs: GOVERNANCE.md has a new section, "Work without peer review, and without approval in the dev environment", and the decisions it needs. The README, the onboarding guide and the setup guide describe the new way of working and how to set it up.

Updating from 0.5.0:

1. Run `npm run standards:update -- v0.6.0`.
2. Make the changes it lists, copying from the app template: the permissions in `.claude/settings.json`, `src/canvas/**/*.md` in `.gitignore`, the terminal rules in `.vscode/settings.json`, and the "How work runs", "Always" and "Never" parts of `AGENTS.md`.
3. Set up each developer's dev environment as the onboarding guide says: the solution, a pac sign-in to the dev environment, the Azure CLI for flows, and coauthoring for each canvas app.

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
