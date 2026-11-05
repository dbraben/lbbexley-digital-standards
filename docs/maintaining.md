# Maintaining the standards

For the Digital Team members who look after this repository. Publishing the harness for the first time, and running the pilot, are in [setup.md](setup.md).

## Layout

```text
.claude-plugin/marketplace.json        the marketplace (one plugin: lbbexley)
plugins/lbbexley/
  .claude-plugin/plugin.json           plugin manifest and version
  .mcp.json                            Microsoft Learn MCP server (documentation search)
  skills/<name>/SKILL.md               the standards, one folder per skill, with supporting files
  skills/review/rules.md               generated from the standards check: don't edit by hand
  agents/                              read-only reviewers, including the end-of-run reviewer (Haiku)
  hooks/hooks.json                     guardrails and the end-of-run gate
  scripts/                             hook scripts, the standards check, the transcript cleaner and the app update script
  config/standards.json                palette, sizes, rules data, ignored paths, Copilot model lists
  config/pre-election-periods.json     pre-election periods
  evals/                               behaviour tests for the skills
sync/rules/                            path rules, synced to .claude/rules/ and .github/instructions/
sync/copilot/                          Copilot's plan, build and check agents, and its hooks
sync/tests/accessibility/              the accessibility test runner, synced to .lbbexley/standards/tests/accessibility/
scripts/sync-app.js                    brings an app repository in line with this release
scripts/build-rules-doc.js             writes skills/review/rules.md from the checker
.github/workflows/standards-check.yml  reusable pull request check for app repositories
.claude/skills/triage-improvements/    /triage-improvements, for maintainers
tests/                                 tests for the checker, hooks, transcript cleaner, sync and plugin structure
```

## Change a skill

- Keep `SKILL.md` short and move detail into supporting files that it links to. The assistant loads supporting files only when it needs them.
- The `description` decides when the skill is used: say what it covers and when to use it.
- `model: opus` makes a skill run on Opus in Claude Code (used for architect and plan). Use tiers (`opus`, `sonnet`, `haiku`), never version numbers. The sync drops the field for Copilot.
- Mark anything that only applies in Claude Code with `<!-- claude-only -->` and `<!-- /claude-only -->`. Give Copilot users an alternative with `<!-- copilot: text -->`, which the sync turns into plain text. `${CLAUDE_PLUGIN_ROOT}` paths and `/lbbexley:<skill>` commands are rewritten for Copilot automatically.
- Cite the source (the B:HIVE guide, the law, the paragraph of the Code) so reviewers can check it.
- Get the sign-off GOVERNANCE.md lists for that area.

Try a change before releasing it by starting Claude Code in a test app repository with your working copy:

```bash
claude --plugin-dir path/to/lbbexley-digital-standards/plugins/lbbexley
```

## Change the standards check

- Rules are in `plugins/lbbexley/scripts/lib/checks.js`: add the rule to `RULES` (id, severity, WCAG criterion if there is one, and what it finds), then the check. Data the rules use (palette, sizes, controls that need labels, personal email domains, tracking hosts) is in `config/standards.json`.
- Keep rules mechanical: anything that needs judgement belongs in a skill or a reviewer.
- Add a test in `tests/checks.test.js` with an example that fails and one that passes. The tests check that every rule id appears there.
- Run `npm run rules-doc` to regenerate the rules document.
- Severity sets the order to fix things in, not whether to fix them: app repositories fail on any finding. So any new rule can fail builds that passed yesterday. Release it as a minor version and tell teams first.

## Path rules and Copilot agents

- Path rules are written once in `sync/rules/<area>.md`, with a `description` and the `paths` they apply to. The sync writes them to `.claude/rules/lbbexley-<area>.md` for Claude Code and `.github/instructions/lbbexley-<area>.instructions.md` for Copilot.
- Copilot's plan, build and check agents are in `sync/copilot/agents/`. Their `model` is filled in from `copilotModels` in `config/standards.json`, in order of preference; reviewer agents with `model: opus`, `sonnet` or `haiku` get the matching list.
- **Check the Copilot model names at every release.** They have to match the names in Copilot's model picker, which change as models are released and differ between plans. Copilot uses the first one available.
- Copilot's hooks are in `sync/copilot/hooks.json`. They run the synced copies of the same scripts, with `LBBEXLEY_HARNESS=copilot` so the scripts answer in Copilot's format. Copilot hooks are a preview feature: after a VS Code or Copilot update, try them in a test repository.

## The accessibility test runner

The Playwright and axe runner lives in `sync/tests/accessibility/`, and the sync copies it into each app repository at `.lbbexley/standards/tests/accessibility/`. The app's `package.json` runs it from there, and each service lists its own pages and screens in `tests/accessibility/targets.json`, which the sync never touches. A change to the runner reaches every service with the next release.

Before releasing a change to it, sync into a copy of the app template, add a page that passes and one that fails to `targets.json`, and run `npm run test:a11y`. A change to the format of `targets.json` breaks every service's list, so keep it backwards compatible or say what to change in the CHANGELOG.

## Harness improvements

App repositories send ideas from their end-of-run check as issues labelled `harness-improvement`, and false alarms as `false-alarm`. Create both labels once:

```bash
gh label create harness-improvement --repo dbraben/lbbexley-digital-standards --color 0E8A16 --description "Idea from an end-of-run check"
gh label create false-alarm --repo dbraben/lbbexley-digital-standards --color D93F0B --description "The standards check reported a problem that isn't one"
```

Triage them regularly, for example every two weeks during the pilot. In Claude Code, `/triage-improvements` groups them, checks each against a source and recommends a decision; you decide. Accepted ideas go into the next release like any other change.

## Test and validate

```bash
npm run verify
claude plugin validate .
claude plugin validate plugins/lbbexley
```

`npm run verify` runs the tests, checks the rules document is up to date and runs the standards check on this repository. The **Tests** workflow runs all of these on every pull request, and syncs into an empty app repository.

Evals check that the skills change what the assistant actually does, by running each case with and without the plugin. They use your Claude usage, so run them before releases that change skills rather than on every change:

```bash
claude plugin eval plugins/lbbexley --allow-tools Write Edit
```

The eval folders aren't Bexley app repositories, so the guardrails stay quiet and the evals measure the skills alone. To include the guardrails and the end-of-run gate, set `EVAL_LBBEXLEY_ALWAYS=1` (plugin evals only pass `EVAL_` variables through); the end-of-run reviews then add some Haiku usage. `EVAL_LBBEXLEY_END_OF_RUN=0` keeps the gate's standards check but skips the review.

## Record a pre-election period

As soon as an election affecting Bexley is called:

1. Add the period to `plugins/lbbexley/config/pre-election-periods.json`, from the notice of election to polling day:

   ```json
   { "name": "Example ward by-election", "start": "2027-03-01", "end": "2027-03-25" }
   ```

2. Release a patch version, and ask teams to update to it (`npm run standards:update -- <version>`), which also moves Claude Code's plugin. Until a service updates, the reminder at the start of each session, in Claude Code and Copilot, doesn't know the new period.
3. Remove the period after the result is declared, in the next release.

The pull request check always reads this file from `main`, so it warns about a new period straight away, even in repositories pinned to an older release.

## Release a version

1. Update `version` in `.claude-plugin/marketplace.json`, `plugins/lbbexley/.claude-plugin/plugin.json` and `package.json` (the tests check they match).
2. Add an entry to `CHANGELOG.md` (the tests check there is one). Say clearly if the release can fail builds that passed before.
3. Merge, then tag: `git tag v0.6.0` and `git push origin v0.6.0`.
4. Update the app template in a pull request:

   ```bash
   npm run standards:update -- v0.6.0
   ```

   This syncs the Bexley files from the tag, updates both pins in `.github/workflows/quality.yml` and the `ref` Claude Code installs the plugin from in `.claude/settings.json`. The sync check, which the check on GitHub runs, fails if any of them names another release. To try a release on a copy of the template before you push the tag, point it at a local clone that has the tag: `LBBEXLEY_STANDARDS_SOURCE=../lbbexley-digital-standards npm run standards:update -- v0.6.0` (in PowerShell, set `$env:LBBEXLEY_STANDARDS_SOURCE` first). `LBBEXLEY_SKIP_PLUGIN_UPDATE=1` stops it moving your own Claude Code plugin.

5. Tell teams. Each app repository runs the same command, as a change of its own: the assistant can run it for them. Until it does, its check on GitHub and its Claude Code plugin stay on the release it's pinned to. The update never changes the repository's own files, such as `AGENTS.md` or the permissions in `.claude/settings.json`: when a release needs them changed, it lists the changes after "To finish moving to this release of the standards", and the CHANGELOG says how. Copy them from the app template.

The marketplace is pinned to a release, so `claude plugin marketplace update lbbexley-digital`, or auto-update, doesn't move anyone to a newer release. `npm run standards:update` moves the plugin when it updates the repository. Anyone else on the repository runs `claude plugin marketplace add dbraben/lbbexley-digital-standards#<release> --scope local`, then `claude plugin update lbbexley@lbbexley-digital`, once they've pulled the update.
