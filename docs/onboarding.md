# Getting started: building Power Platform services with the Bexley standards

This guide takes about an hour the first time. You'll end up with an app repository where your AI assistant follows the council's brand, accessibility and legal rules, plans before it builds, checks its own work before it finishes, and can't easily be pointed at real data.

## The rules that never bend

- **Dev environments only.** Never connect the assistant to a test or production environment.
- **Fictional data only.** Never type, paste or upload real resident or staff information: no names, case notes, emails, screenshots of real records or exports. The safe formats are in the data-protection skill (`test-data.md`).
- **Pipelines deploy, people don't.** Don't import solutions or upload sites to test or production from your laptop.
- **Zero findings, however minor.** Work isn't done while the standards check, the accessibility tests or a reviewer reports anything.
- **A passing check isn't proof.** Tools find many problems, but you still test with a keyboard and a screen reader, and get the sign-offs the review asks for.

## 1. Set up your privacy settings

You're using your own AI subscription during the pilot, so set these before anything else:

- **Claude** (Pro or Max): in Claude, open Settings, then Privacy, and turn off the setting that lets Anthropic use your chats and coding sessions to improve its models. This also covers Claude Code used with your account.
- **GitHub Copilot** (individual plans): in your GitHub settings under Copilot, turn off any option that lets GitHub use your prompts, suggestions or code to improve its products.

## 2. Install the tools

On your laptop:

| Tool | Why |
|---|---|
| Visual Studio Code | Where you work |
| Git | Version control |
| Node.js 22 or later (LTS) | Runs the standards check and the Dataverse MCP server |
| .NET 10 SDK | Runs Microsoft's canvas app authoring MCP server (canvas apps only) |
| Power Platform CLI (`pac`) | Connects to your dev environment. Install the Power Platform Tools extension in VS Code, which includes it |
| Azure CLI (`az`) | Signs in Microsoft's Power Automate tools, which build flows in your dev environment (flows only) |
| Claude Code, or GitHub Copilot | Your assistant. For Claude Code, install the command-line version from Anthropic's [set-up guide](https://code.claude.com/docs/en/setup), then run `claude` and sign in with your Claude account. You use it in VS Code's terminal (see step 4) |

The Digital Team gives you a Power Platform dev environment and access to the GitHub repositories. You need the dev environment to build: everything is built there, and your repository keeps the latest version.

### What the Digital Team sets up first

For each dev environment used in the pilot:

- No real data in it, ever.
- The Bexley publisher (prefix `lbbexley`) imported, so developers create solutions with it.
- The Dataverse MCP server turned on for the environment, with the **Dataverse CLI** client (app ID `0c412cc3-0dd6-449b-987f-05b053db9457`) enabled in the environment's MCP settings. A tenant administrator grants admin consent for the Dataverse CLI app once. Microsoft's article "Connect to Dataverse with model context protocol in non-Microsoft clients" has the steps.
- Data policies that block connectors the council doesn't allow.

## 3. Create your app repository

1. Sign in to GitHub, open **lbbexley-app-template** and choose **Use this template** (top right, beside **Star**), then **Create a new repository**.
2. Name it `lbbexley-` followed by your service, for example `lbbexley-parking-permits`, and make it private.
3. Clone it and open the folder in VS Code. Choose **Trust** when VS Code asks.

## 4. Turn on the standards

**Claude Code.** Open VS Code's terminal in the folder and run `claude`. Use the terminal rather than the Claude Code panel: the panel doesn't take its starting mode from the project, so it doesn't start in plan mode. When Claude Code asks whether to trust the folder, say yes. It then offers to add the Bexley and Microsoft plugin marketplaces and turn on the Bexley plugin: accept. Check it's on: `/plugin` shows **lbbexley** enabled, and typing `/lbbexley` lists its commands. The plugin's reminder at the start of each session goes to Claude rather than to you, so to see it working, ask Claude which rules apply in this repository.

The plugin comes from the release your repository is on, the one in `.github/workflows/quality.yml`. To check, run `claude plugin list` in a second terminal: the version under `lbbexley@lbbexley-digital` matches it.

If it doesn't offer, add the plugin yourself, for this computer only. Exit Claude Code, run these in the same terminal with your repository's release, then start Claude Code again:

```bash
claude plugin marketplace add dbraben/lbbexley-digital-standards#v0.6.1 --scope local
claude plugin install lbbexley@lbbexley-digital --scope local
```

**GitHub Copilot.** Nothing to install. Microsoft's Power Automate, Power Pages and Model Apps plugins send usage telemetry to Microsoft by default (tenant and environment IDs, and your Entra object ID); the template turns it off for Claude Code sessions, and for VS Code set the same variables for your account: `POWER_PLATFORM_SKILLS_TELEMETRY_POWER_AUTOMATE_OPTOUT`, `..._POWER_PAGES_OPTOUT` and `..._MODEL_APPS_OPTOUT`, each to `1` (`setx` in PowerShell, then restart VS Code). Copilot's agent mode reads `AGENTS.md`, the Bexley skills in `.github/skills/`, the path rules in `.github/instructions/` and the agents in `.github/agents/`. The template turns on Copilot's hooks (`chat.useHooks` in `.vscode/settings.json`), which run the same standards check after each edit and the same end-of-run gate. Hooks are a preview feature in Copilot and may change, and there's no prompt guard for personal data, so take extra care: the pull request check is your safety net.

## 5. Set up your app

1. In Claude Code, run `/lbbexley:new-app` and answer the questions. (In Copilot, ask it to use the `lbbexley-new-app` skill.)
2. Restart Claude Code so the Microsoft plugins it turned on are loaded.
3. Connect to your dev environment: `pac auth create --environment https://yourorg-dev.crm11.dynamics.com`. Then ask the assistant to clone the solution into `src/solution`, once the solution exists (step 6).
4. Canvas apps: create the app in your solution (blank is fine), save it, turn on coauthoring (**Settings**, **Updates**, **Coauthoring**), and keep it open in Power Apps Studio. Then run `/configure-canvas-mcp` with the Studio address. Microsoft's canvas tools change the app through that open tab. Flows: run `az login` with the same account as `pac`.
5. If you have your own dev environment, set it for the Dataverse MCP server (PowerShell, then restart VS Code):

   ```powershell
   setx DATAVERSE_DEV_URL "https://yourorg-dev.crm11.dynamics.com"
   ```

   The template's `.mcp.json` starts the server through Windows' `cmd`. On a Mac or Linux, add your own for this computer only, then start Claude Code again. It takes the place of the template's, and nothing in the repository changes:

   ```bash
   claude mcp add --scope local dataverse -- npx -y @microsoft/dataverse mcp https://yourorg-dev.crm11.dynamics.com
   ```

6. Ask the Digital Team to import the Bexley publisher into your dev environment, then create your solution with it. In Power Apps, select the solution and choose **Set preferred solution**, so anything you create in the maker portal lands in it. Microsoft's tools create flows and tables outside it: the assistant adds each one to the solution (`pac solution add-solution-component`) before it syncs.
7. Install the test tools: `npm install`, then `npm run test:a11y:install`. If your pages or screens need a sign-in, run `npm run test:a11y:login` and sign in with a test account. The saved sign-in (`.auth/a11y-state.json`) is a secret: it's never committed, and it expires, so run the command again when the tests say so. A page or screen that needs a sign-in fails until there is one: it hasn't been tested, so it hasn't passed. Give pages their full address in `tests/accessibility/targets.json`, or, for a path, set `A11Y_BASE_URL` to the site's address before both commands.

## 6. Start from your requirements

Every project starts from what the people who run and use the service said, not from assumptions. You don't write or edit any files for this: the assistant asks, and writes the requirements.

1. **Start the conversation.** In Claude Code, press Shift+Tab until it says **accept edits on**, then run `/lbbexley:requirements`. In Copilot, ask **lbbexley-plan** to use the **lbbexley-requirements** skill.
2. **Answer in the chat, or later.** It sums up what it already knows from the set-up, then asks two or three questions at a time. To answer with the service team instead, say *"Give me the questions as a table"*: copy the table into an email, a Teams chat or a document, fill it in, and paste it back into the chat, including its first line, which starts **Bexley requirements answers**. That line tells the assistant where you were, even in a new session.
3. **Check the summary** it shows you: the users and their needs, the user stories with priorities, and the open questions. Ask for changes in plain words. It writes `docs/requirements.md`, and commits it for you once the end-of-run check passes. In Copilot, select **Check my work**, then **Commit the work**.
4. **Ask the service owner to agree it.** Ask for the summary as text, and paste it into an email or a Teams message. When they agree, tell the assistant, so it records their role and the date.
5. **Design the service** with `/lbbexley:architect`, then plan the first Must story.

Describe people by role, never by name, and don't paste anyone's details. To start from a recorded Teams meeting instead, download the transcript as a `.vtt` file to your Downloads folder, and clean it yourself, never with the assistant: `npm run transcript:clean -- ~/Downloads/<transcript file>.vtt` (in PowerShell, `"$HOME\Downloads\<transcript file>.vtt"`). It writes a copy with roles instead of names to `docs/discovery/`, which is never committed, and a roles file next to the original. Change "Speaker 1" and so on in the roles file to roles, run it again, and read the copy through to remove anything else that could identify a person (the data-protection skill's `transcripts.md` has the checklist). The requirements skill reads it with everything else.

## 7. How to work

Every change goes plan, build, check, each step on the model that suits it. The assistant builds in your dev environment, and your repository keeps the guidelines and the latest version: nobody edits the service's source there by hand.

1. **Plan, on the strongest model.** Sessions start in plan mode with `opusplan`, so Claude Code plans on Opus. Describe the user need, not the screens. For a new service, start from the requirements (step 6); for each change, the plan skill writes the plan to `docs/plans/`, with the words users will read and acceptance criteria. In Copilot, use the **lbbexley-plan** agent. Read the plan and approve it, or ask for changes.
2. **Build, on the everyday model, in the dev environment.** Approving the plan switches Claude Code to Sonnet; in Copilot, choose **Build this plan** to hand over to lbbexley-build. The assistant builds directly in the dev environment with Microsoft's tools: a canvas app through the open Power Apps Studio tab, flows with the Power Automate plugin, tables with the Dataverse MCP server, a Power Pages site with the power-pages plugin. It doesn't ask before each change there. The guardrails keep it to the dev environment in `AGENTS.md`, block deletes and force pushes, and ask before it runs a flow or calls a connector. Build in small steps, one screen, flow or topic at a time. The standards check runs on everything it writes and sends every finding straight back to it.
3. **Check, on a smaller model.** When the assistant tries to finish, the end-of-run check first has it bring the latest version into the repository (`pac solution sync`, and a canvas app's source through the canvas tools), then runs the standards check on everything that changed, then asks the end-of-run reviewer (Haiku) to review the changes for what tools can't see. Claude Code shows that request as a "Stop hook error": it's the check working, not a fault. The reviewer runs in the background, so the assistant's turn can end while it works, with "the review on the smaller model is still running". When the review reports, the assistant carries on by itself. The assistant fixes what it finds before it can finish. When everything passes, the check asks Claude to commit the work for you, on the branch you're on, and push it to GitHub: that's one more "Stop hook error", starting "Bexley end-of-run check passed. Now save the work". You never need to run Git yourself. In Copilot, choose **Check my work** to hand over to lbbexley-check, and when it finds nothing outstanding, **Commit the work**, which commits and pushes it. The assistant stops and lists what's outstanding for you if it can't fix a standards problem in three attempts, if it thinks a reviewer's problem is wrong and explains why instead of fixing it, or after five reviews in one request. Decide what to do about each one: for a reviewer's problem the assistant explained, say if you agree, and it commits the work. Tell the Digital Team if you think a check is wrong.
4. **Test in your dev environment** with fictional data: `npm run verify` runs the standards check on everything and the accessibility tests. Then test by hand, keyboard only, with a screen reader and at 400% zoom.
5. **Review.** Run `/lbbexley:review` (Copilot: `/lbbexley-review`) and fix everything it lists, however minor. Do the "Needs a person" tests.
6. **It's on GitHub already.** Every commit is pushed, and the Quality workflow runs the standards check there too and, once your environment's address is set up, the accessibility tests. Changed something in the dev environment yourself, in Studio or a designer? Run `/lbbexley:sync` (Copilot: the lbbexley-sync skill) so the repository has it. Working in a team? Protect `main` on GitHub, and put each change on a branch of its own with a pull request, so a colleague reviews it.

### The harness improves itself

The end-of-run reviewer also notes where the harness let you down: a problem the standards check should have caught, guidance a skill was missing, a rule that got it wrong. Its ideas collect in `.lbbexley/improvements.md`, and the session start tells you when some are waiting. Run `/lbbexley:improve` (Copilot: the lbbexley-improve skill) every so often, for example at the end of a sprint: it applies the ideas that belong to your service and turns the rest into proposals for the Digital Team.

### Keeping the standards up to date

When the Digital Team releases a new version of the standards, update your repository as a change of its own, with nothing else in it:

```bash
npm run standards:update -- v0.6.1
```

It updates the synced Bexley files, the release the Quality workflow checks against and the release Claude Code installs the plugin from. If Claude Code is installed, it then moves the plugin to that release: start Claude Code again to load it. If it can't, it gives you two commands to run in a terminal in the repository. For `v0.6.1`:

```bash
claude plugin marketplace add dbraben/lbbexley-digital-standards#v0.6.1 --scope local
claude plugin update lbbexley@lbbexley-digital
```

Colleagues who share the repository run the same two commands once the update is on GitHub and they've pulled it. If the update ends with "To finish moving to this release of the standards", it lists changes to your own files, such as `AGENTS.md` or `.claude/settings.json`: ask the assistant to make them, copying from the app template.

## Help

- Ask the Digital Team in their Teams channel.
- Something in a skill is wrong or unclear: open an issue in **lbbexley-digital-standards**.

## Troubleshooting

| Problem | Fix |
|---|---|
| `/plugin` doesn't list **lbbexley**, or `/lbbexley` shows no commands | Add the marketplace and install the plugin (step 4), then check `AGENTS.md` mentions lbbexley: the guardrails only run in Bexley repositories. |
| A prompt was blocked as personal data, but the data is made up | Add `[fictional]` to the message and send it again. Never do this for real data. |
| The standards check flags something that's right | Add `lbbexley-ignore: <rule> <reason>` in a comment on that line or the line above. A suppression without a reason is itself a finding. Then open a "Standards check false alarm" issue so the rule can be fixed. |
| The assistant keeps being sent back at the end of a run | That's the end-of-run check doing its job: the message says what's outstanding. Each review usually finds less. If it can't converge, it stops and lists the problems for you. |
| The end-of-run check runs when you only asked a question | It only runs when files changed in the session. Files changed by a command count too, so check `git status`. |
| The accessibility tests skip everything | Add your pages and screens to `tests/accessibility/targets.json`, with full addresses or, for paths, `A11Y_BASE_URL` set to the site's address. |
| An accessibility test says it needs a saved sign-in, or that it opened a sign-in page | Nothing was tested, so it fails. Run `npm run test:a11y:login` again: saved sign-ins expire. On GitHub, refresh the `A11Y_STORAGE_STATE` secret, or, if GitHub can't sign in, set the `A11Y_SKIP_SIGNED_IN` variable to `1` and run those tests on your computer. |
| Dataverse MCP tools don't appear | Check `DATAVERSE_DEV_URL` is set (on a Mac or Linux, the address in `claude mcp get dataverse`), Node.js is installed, and you signed in when asked. Run `/mcp` to see the server's status. |
| The pull request check says the Bexley files are out of date | Someone edited a synced file by hand, or the workflow, `.claude/settings.json` and the files are on different releases. Run `npm run standards:update -- <version>`. |
| `claude plugin list` shows a different version from `quality.yml` | Move the plugin to the repository's release with the two commands in "Keeping the standards up to date". |
| `npm run transcript:clean` couldn't find who said what | Download the transcript from Teams again as a `.vtt` file, and clean that. |
| `npm run transcript:clean` says the original is inside your repository | Move it out, for example to Downloads, and run it again. The assistant can read anything inside the repository. |
| There's no **Use this template** button on the template | Sign in to GitHub. The button is at the top right, beside **Star**. |
| `claude` isn't found in VS Code's terminal | The VS Code extension doesn't add `claude` to the terminal. Install the command-line version (step 2), then open a new terminal. |
| `/model` doesn't show `opusplan` | Claude Code calls it **Opus Plan Mode**. It's the last option, and it's only listed while it's the model in use. If it isn't there, type `/model opusplan`. |
| The end-of-run check asks for the same review again and again, then says "the end-of-run review didn't run" | Your Claude Code plugin is older than 0.3.1. Update it (see "Keeping the standards up to date"), then start Claude Code again. |
| Claude Code doesn't start in plan mode | You're using the Claude Code panel, which never takes its starting mode from the project. Run `claude` in VS Code's terminal instead, or set `claudeCode.initialPermissionMode` to `plan` in your VS Code user settings. |
| The end-of-run check keeps asking to "bring the latest version from the dev environment into the repository" | `pac solution sync` isn't working. Check `pac` is signed in to the dev environment (`pac env who`), and that `src/solution` exists: ask the assistant to clone the solution into it. After three tries the check stops and tells you instead. |
| The guardrails say `pac` is connected to another environment | Your `pac` profile points somewhere other than the dev environment in `AGENTS.md`. Switch with `pac env select --environment <dev environment>`, or `pac auth create` for it. |
| A flow or table you built isn't in `src/solution` after the sync | It isn't in the solution: Microsoft's tools create flows and tables outside it. Ask the assistant to add it (`pac solution add-solution-component`) and sync again, and set the service's solution as your preferred solution in Power Apps for anything you create there. |
| The end-of-run check says the work hasn't been committed or pushed | The assistant stopped before it could. Ask it to commit and push, or run `git status` and do it yourself. A push to a protected `main` fails: work on a branch instead. |
| The push to GitHub fails | Sign in to GitHub in Git (the GitHub CLI's `gh auth login` sets it up). If `main` is protected, your team wants pull requests: work on a branch. |
| Microsoft's canvas tools won't connect, or `dnx` isn't found | Install the .NET 10 SDK (`dotnet --list-sdks`), check coauthoring is on, and give `/configure-canvas-mcp` the address of Studio's editing page, not the player. Keep that tab open while you build. |
| Microsoft's Power Automate tools can't sign in | Run `az login` with the same account as `pac`. If the council's sign-in policies block the Azure CLI, build the flow in the designer and run `/lbbexley:sync` to bring it in. |
