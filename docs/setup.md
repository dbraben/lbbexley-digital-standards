# Publish and set up the harness

For the person who publishes the harness to GitHub and runs the pilot. During the pilot the harness lives on `github.com/dbraben`; it moves to the council's GitHub later.

> [!NOTE]
> Developers never follow these steps. They create their own repository from the template, as the [README](../README.md) and the workshop explain.

## The three repositories

The harness is three repositories. A release comes as one download with a folder for each, and each folder is published as one repository:

| Folder | Published as | Who uses it |
|---|---|---|
| `lbbexley-digital-standards` | `dbraben/lbbexley-digital-standards`, tagged with the release, such as `v0.3.0` | Claude Code installs the plugin from it; every service repository's pull request check runs its workflow |
| `lbbexley-app-template` | `dbraben/lbbexley-app-template`, marked as a template | Developers select **Use this template** to create their own repository |
| `lbbexley-ai-build-workshop` | `dbraben/lbbexley-ai-build-workshop` | Developers follow the exercises with a project of their own |

Publish each folder as its own repository. The plugin, the pull request check and the template refer to `dbraben/lbbexley-digital-standards` by name, so nothing works if the folders are combined into one repository.

## 1. Publish the repositories (once, about 20 minutes)

You need Git and the GitHub CLI, signed in as the account that will own the repositories. On a Mac:

```bash
brew install gh
gh auth login
```

Unzip the download: double-click it. If you've downloaded it more than once, your Mac adds a number to the name, such as `... 2.zip`: delete the older copies and their folders first, so you publish the latest. Move the three folders to Downloads, then, in Terminal:

```bash
# The standards
cd ~/Downloads/lbbexley-digital-standards
git init -b main && git add -A && git commit -m "Bexley digital standards 0.3.0"
gh repo create dbraben/lbbexley-digital-standards --public --source . --push
git tag v0.3.0 && git push origin v0.3.0
gh label create harness-improvement --color 0E8A16 --description "Idea from an end-of-run check"
gh label create false-alarm --color D93F0B --description "The standards check reported a problem that isn't one"

# The app template
cd ~/Downloads/lbbexley-app-template
git init -b main && git add -A && git commit -m "Bexley app template"
gh repo create dbraben/lbbexley-app-template --public --source . --push
gh repo edit dbraben/lbbexley-app-template --template

# The workshop
cd ~/Downloads/lbbexley-ai-build-workshop
git init -b main && git add -A && git commit -m "Bexley AI build harness workshop"
gh repo create dbraben/lbbexley-ai-build-workshop --public --source . --push
```

- **Public or private.** Public is simplest: none of the three contains secrets or real data, and the plugin and the pull request check can then read the standards without tokens. If you make the standards private, every developer needs read access to it, and each service repository needs a `standards-token` secret (see the comments in `.github/workflows/standards-check.yml`). If you make the template or the workshop private, add each developer to them.
- **Already published an earlier version?** Don't run the commands above. A release download includes `publish.sh`, which updates all three repositories in one go, keeping their history: run `bash publish.sh` from the unzipped folder. Or, by hand: copy the new files over your clone of each repository (deleting files the release removed), commit and push, and tag the standards with the new version.
- **Git asks who you are?** Set your name and email once with `git config --global user.name "Your Name"` and `git config --global user.email "you@example.com"`, then run the commit again.

Then, on GitHub:

1. In the standards repository's security settings, turn on private vulnerability reporting (SECURITY.md points people to it).
2. Protect the `main` branch in the standards and template repositories: require pull requests, and require the checks to pass. In the standards repository, those are **Tests** and **Plugin validation**. Service repositories get **Bexley standards**, and **Accessibility tests** once they're turned on.

## 2. Before the pilot starts

- Read [GOVERNANCE.md](../GOVERNANCE.md). It sets out the risks of staff using personal AI accounts, how the self-improvement loop is governed, and the decisions still open. Get Information Governance and the Data Protection Officer to approve the pilot.
- Check the Copilot model names in `plugins/lbbexley/config/standards.json` (`copilotModels`) against the model picker in your Copilot plans.
- Ask Communications for an SVG version of the logo and the clear-space rules, and add them to `plugins/lbbexley/skills/brand/assets/`. The PNG is already there.
- Set up the dev environments as the [onboarding guide](onboarding.md) describes ("What the Digital Team sets up first").
- Add the maintainers' GitHub usernames to `.github/CODEOWNERS` in the standards and template repositories.

## 3. Bring developers in

Send developers two links: the [README](../README.md) of this repository, which is written for them, and the workshop. Each of them creates their own repository from the template. They never push to the harness repositories.

## 4. Turn on the accessibility tests in a service repository

This is for each service team, in their own repository. The tests run on every pull request once the repository has an **A11Y_BASE_URL** variable (Settings, then Secrets and variables, then Actions, then Variables): the Power Pages site's address, or the dev environment's address for a service with no Power Pages site.

Pages and screens behind a sign-in also need an **A11Y_STORAGE_STATE** secret: run `npm run test:a11y:login` with a test account that can only reach the dev environment and fictional data, then save the file `.auth/a11y-state.json` as the secret, base64-encoded. Sign-ins expire, so refresh it when the tests say so. The council's Conditional Access policies may block sign-ins from GitHub's servers; if they do, run the signed-in tests on developers' machines and keep the public pages in the workflow.

## What's new

### In 0.3.0: start from your own project

- **Requirements.** `/lbbexley:requirements` turns a cleaned Teams meeting transcript, or a developer's own requirement prompt, into `docs/requirements.md`: users, user stories with acceptance criteria, rules, data, duties and open questions. The architect and plan skills start from it.
- **Transcript cleaner.** `npm run transcript:clean` makes a copy of a Teams transcript with roles instead of names and with contact details removed. Originals and names stay outside the repository, and the cleaned copy is never committed.
- **No set scenario.** The workshop now uses each developer's own project, and the examples in the skills don't share one fictional service.

### In 0.2: plan, build, check

- **Plan, build, check.** Claude Code plans on Opus (`opusplan`, sessions start in plan mode), builds on Sonnet and checks on Haiku. Copilot gets matching plan, build and check agents that hand over to each other.
- **End-of-run check.** The assistant can't finish until everything it changed passes the standards check and a review on the smaller model. Problems the reviewer finds are held open until they're fixed.
- **The harness improves itself.** The reviewer also logs ideas for improving the harness. `/lbbexley:improve` applies the local ones and sends the rest to this repository as issues for the Digital Team to decide on.
- **Zero findings.** Every finding of any severity has to be fixed, there are 20 new accessibility and quality rules, and suppressions need a written reason.
- **Accessibility tests.** Playwright and axe-core against every page and screen, at WCAG 2.2 AA, with reflow and focus tests for Power Pages. The test runner comes from the standards and updates with each release; each service lists its own pages and screens.
- **Structure** adopted from the web development repository the team liked (path rules, a quality-checks skill, parallel workflows, Dependabot, a dev container, issue forms), and an architect skill based on the open-source power-platform-architect plugin.

The [CHANGELOG](../CHANGELOG.md) has the full list. Release 0.2.0 could fail builds that passed with 0.1.0; 0.3.0 adds no new rules.

## What's been checked

- **80 automated tests pass**, covering all 41 rules in the standards check (including contrast through transparent backgrounds), the guardrails, the end-of-run gate and its limits, the transcript cleaner (WebVTT, Word and text layouts, names, contact details and numbers, and its safety stops), the sync (including the accessibility test runner and links between skills) and the plugin's structure.
- **The transcript cleaner**, run through `npm run transcript:clean` in a copy of the template: the cleaned copy used roles, contact details were removed, nothing was printed or kept in the repository with a name in it, and Git ignored the cleaned file.
- **The standards check passes on the standards and template repositories** with zero findings. Claude Code's plugin validator passes for the marketplace and the plugin, and actionlint passes for every workflow.
- **Accessibility tests on sample pages**, run from the synced copy of the test runner. A compliant page passes every check. A page with deliberate failures fails all three tests: axe finds the contrast, page title, language, image alt text and form label problems, and the reflow and focus tests fail too.
- **A live Claude Code session** on a copy of the template, asked to build a confirmation screen. The check after saving caught a hover colour with 3.32:1 contrast, and the assistant fixed it. The end-of-run gate then had the Haiku reviewer look at the work four times. The assistant fixed what it found each time, including button wording, fixed sizes that would clip text at 400% zoom, and a missing "what happens next" section. The gate then let it finish with zero findings. The reviewer logged five ideas for improving the harness, for example a check for `Navigate()` calls to screens that don't exist. The four reviews cost about $0.02 of the session's $0.57, at list prices.
- **Copilot hooks**, run from the synced hooks file with input in the format Copilot documents, on a copy of the template. A Dataverse delete was denied, and an edit that hid keyboard focus was flagged. The end-of-run gate held the agent until the edit was fixed, then asked for lbbexley-check once.
- **`npm run standards:update`** updated a copy of the template from a local release, changing both the synced files and the workflow's pins.

## Not yet checked

- **Copilot hooks** are a preview feature. They were tested with the input VS Code is documented to send, not inside VS Code itself. Try them in a test repository before the pilot.
- **Copilot model names** need checking against your plans (above).
- **Real Teams transcripts.** The transcript cleaner was tested with made-up transcripts in the WebVTT and Word layouts Teams uses, not with a real download. Try it on a short real meeting first, and use the `.vtt` download if a `.docx` doesn't work.
- **Canvas app and model-driven accessibility tests** need a sign-in to a real tenant, so they've only been tested on sample pages. Try one screen in the dev environment first.
- **Solution checker** runs by hand in the maker portal (the quality-checks skill says when). It isn't in the pull request check.
- The plugin passes Claude Code's validator. The public plugin directory's extra checks (a licence and an icon) only matter if you ever publish it there, and the licence is an open decision in GOVERNANCE.md.
