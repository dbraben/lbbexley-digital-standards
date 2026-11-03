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
| Claude Code, or GitHub Copilot | Your assistant. For Claude Code, install the Claude Code extension for VS Code (or the command-line version) and sign in with your Claude account |

The Digital Team gives you a Power Platform dev environment and access to the GitHub repositories.

### What the Digital Team sets up first

For each dev environment used in the pilot:

- No real data in it, ever.
- The Bexley publisher (prefix `lbbexley`) imported, so developers create solutions with it.
- The Dataverse MCP server turned on for the environment, with the **Dataverse CLI** client (app ID `0c412cc3-0dd6-449b-987f-05b053db9457`) enabled in the environment's MCP settings. A tenant administrator grants admin consent for the Dataverse CLI app once. Microsoft's article "Connect to Dataverse with model context protocol in non-Microsoft clients" has the steps.
- Data policies that block connectors the council doesn't allow.

## 3. Create your app repository

1. On GitHub, open **lbbexley-app-template** and choose **Use this template**, then **Create a new repository**.
2. Name it `lbbexley-` followed by your service, for example `lbbexley-parking-permits`, and make it private.
3. Clone it and open the folder in VS Code. Choose **Trust** when VS Code asks.

## 4. Turn on the standards

**Claude Code.** Start Claude Code in the folder. When it asks whether to trust the folder, say yes. It then offers to add the Bexley and Microsoft plugin marketplaces and turn on the Bexley plugin: accept. Check it's on: `/plugin` shows **lbbexley** enabled, and typing `/lbbexley` lists its commands. The plugin's reminder at the start of each session goes to Claude rather than to you, so to see it working, ask Claude which rules apply in this repository.

If it doesn't offer, add them yourself:

```text
/plugin marketplace add dbraben/lbbexley-digital-standards
/plugin install lbbexley@lbbexley-digital
```

**GitHub Copilot.** Nothing to install. Copilot's agent mode reads `AGENTS.md`, the Bexley skills in `.github/skills/`, the path rules in `.github/instructions/` and the agents in `.github/agents/`. The template turns on Copilot's hooks (`chat.useHooks` in `.vscode/settings.json`), which run the same standards check after each edit and the same end-of-run gate. Hooks are a preview feature in Copilot and may change, and there's no prompt guard for personal data, so take extra care: the pull request check is your safety net.

## 5. Set up your app

1. In Claude Code, run `/lbbexley:new-app` and answer the questions. (In Copilot, ask it to use the `lbbexley-new-app` skill.)
2. Restart Claude Code so the Microsoft plugins it turned on are loaded.
3. Canvas apps: run `/configure-canvas-mcp` once.
4. Connect to your dev environment: `pac auth create --environment https://yourorg-dev.crm11.dynamics.com`.
5. If you have your own dev environment, set it for the Dataverse MCP server (PowerShell, then restart VS Code):

   ```powershell
   setx DATAVERSE_DEV_URL "https://yourorg-dev.crm11.dynamics.com"
   ```

6. Ask the Digital Team to import the Bexley publisher into your dev environment, then create your solution with it.
7. Install the test tools: `npm install`, then `npm run test:a11y:install`. If your pages or screens need a sign-in, run `npm run test:a11y:login` and sign in with a test account. The saved sign-in (`.auth/a11y-state.json`) is a secret: it's never committed, and it expires, so run the command again when the tests say so.

## 6. Start from your requirements

Every project starts from what the people who run and use the service said, not from assumptions.

1. **Record a discovery conversation** with the service team in Teams, with transcription on. Tell everyone why you're recording and when the transcript will be deleted, and ask them to talk about how the service works, not about particular residents.
2. **Download the transcript** from the meeting's **Recap** tab, as a `.vtt` file if you can, to your Downloads folder. Never save it in your repository.
3. **Clean it yourself**, never with the assistant. In your repository's folder, on a Mac:

   ```bash
   npm run transcript:clean -- ~/Downloads/<transcript file>.vtt
   ```

   In PowerShell, use `"$HOME\Downloads\<transcript file>.vtt"`. It writes a cleaned copy to `docs/discovery/`, which is never committed, and a roles file next to the original. Change "Speaker 1" and so on in the roles file to roles such as "Service manager", and run it again. Then read the cleaned copy from start to finish and remove anything else that could identify a person: the checklist is in the data-protection skill (`transcripts.md`).
4. **Add your own requirement prompt** for anything the meeting didn't cover: copy `.github/skills/lbbexley-requirements/requirement-prompt.md` to `docs/discovery/requirement-prompt.md` and fill it in (`requirement-prompt-example.md` next to it shows the level of detail). No transcript? The prompt on its own is enough to start.
5. **Write the requirements** with `/lbbexley:requirements` (Copilot: the lbbexley-requirements skill, with lbbexley-plan). It writes `docs/requirements.md`: users, user stories with acceptance criteria, rules, data, duties and open questions. Ask the service owner to check it.
6. **Design the service** with `/lbbexley:architect`, then create an issue for each story and plan the first one.

## 7. How to work

Every change goes plan, build, check, each step on the model that suits it.

1. **Plan, on the strongest model.** Sessions start in plan mode with `opusplan`, so Claude Code plans on Opus. Describe the user need, not the screens. For a new service, start from the requirements (step 6); for each change, the plan skill writes the plan to `docs/plans/`, with the words users will read and acceptance criteria. In Copilot, use the **lbbexley-plan** agent. Read the plan and approve it, or ask for changes.
2. **Build, on the everyday model.** Approving the plan switches Claude Code to Sonnet; in Copilot, choose **Build this plan** to hand over to lbbexley-build. Build in small steps, one screen, flow or topic at a time, and read what the assistant writes. The standards check runs every time it saves a file and sends every finding straight back to it.
3. **Check, on a smaller model.** When the assistant tries to finish, the end-of-run check runs the standards check on everything it changed, then asks the end-of-run reviewer (Haiku) to review the changes for what tools can't see. The assistant fixes what it finds before it can finish. In Copilot, choose **Check my work** to hand over to lbbexley-check. The assistant stops and lists what's outstanding for you if it can't fix a standards problem in three attempts, if it thinks a reviewer's problem is wrong and explains why instead of fixing it, or after five reviews in one request. Decide what to do about each one, and tell the Digital Team if you think a check is wrong.
4. **Test in your dev environment** with fictional data: `npm run verify` runs the standards check on everything and the accessibility tests. Then test by hand, keyboard only, with a screen reader and at 400% zoom.
5. **Review.** Run `/lbbexley:review` (Copilot: `/lbbexley-review`) and fix everything it lists, however minor. Do the "Needs a person" tests.
6. **Pull request.** Commit to a branch and open a pull request with the template. The Quality workflow runs the standards check and, once your environment's address is set up, the accessibility tests. A colleague reviews it.

### The harness improves itself

The end-of-run reviewer also notes where the harness let you down: a problem the standards check should have caught, guidance a skill was missing, a rule that got it wrong. Its ideas collect in `.lbbexley/improvements.md`, and the session start tells you when some are waiting. Run `/lbbexley:improve` (Copilot: the lbbexley-improve skill) every so often, for example at the end of a sprint: it applies the ideas that belong to your service and turns the rest into proposals for the Digital Team.

### Keeping the standards up to date

When the Digital Team releases a new version of the standards, update your repository in a pull request of its own:

```bash
npm run standards:update -- v0.3.0
```

It updates the synced Bexley files and the version the Quality workflow checks against. Claude Code users also update the plugin: `/plugin marketplace update lbbexley-digital`.

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
| The accessibility tests skip everything | Add your pages and screens to `tests/accessibility/targets.json`, and set `A11Y_BASE_URL` for Power Pages. |
| The accessibility tests stop at a sign-in page | Run `npm run test:a11y:login` again: saved sign-ins expire. |
| Dataverse MCP tools don't appear | Check `DATAVERSE_DEV_URL` is set, Node.js is installed, and you signed in when asked. Run `/mcp` to see the server's status. |
| The pull request check says the Bexley files are out of date | Someone edited a synced file by hand, or the workflow and the files are on different releases. Run `npm run standards:update -- <version>`. |
| `npm run transcript:clean` couldn't find who said what | Download the transcript from Teams again as a `.vtt` file, and clean that. |
| `npm run transcript:clean` says the original is inside your repository | Move it out, for example to Downloads, and run it again. The assistant can read anything inside the repository. |
| Claude Code doesn't start in plan mode in VS Code | Set `claudeCode.initialPermissionMode` to `plan` in your VS Code user settings. |
