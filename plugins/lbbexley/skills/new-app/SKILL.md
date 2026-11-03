---
name: new-app
description: Sets up a new repository made from the Bexley app template - asks about the service, fills in AGENTS.md and the compliance documents, connects the dev environment, turns on the Microsoft plugins the build needs and installs the test tools. Run once, straight after creating a repository from the template.
argument-hint: "[service name]"
disable-model-invocation: true
---

# Set up a new Bexley app repository

## 1. Check this is a fresh template

Read `AGENTS.md`. If it has no `{{...}}` placeholders, the repository is already set up: say so, and ask what the person wants to change instead of starting again. If `docs/requirements.md` or `docs/architecture.md` exists, use them to answer the questions below.

## 2. Ask about the service

Use $ARGUMENTS as the service name if given. Ask for anything else you don't know, all in one go, and suggest sensible answers:

| Placeholder | Question |
|---|---|
| `{{SERVICE_NAME}}` | What is the service called, in plain English? (for example "Parking permit applications") |
| `{{SERVICE_SUMMARY}}` | In one sentence, what does it let people do? |
| `{{AUDIENCE}}` | Who uses it: residents and businesses, staff, or both? |
| `{{BUILD_TYPES}}` | What are you building: canvas app, Power Pages site, Copilot Studio agent, Power Automate flows, model-driven app? (any combination) |
| `{{SERVICE_OWNER}}` | Which team owns the service? (a team or role, not a personal name) |
| `{{DEV_ENVIRONMENT_URL}}` | What is the URL of the dev environment? (like `https://yourorg-dev.crm11.dynamics.com`) |
| `{{PERSONAL_DATA}}` | Will it handle personal data? If so, what kinds? |
| `{{AI_FEATURES}}` | Will it use AI: an agent, AI Builder, AI prompts in flows, or none? |

Derive `{{SOLUTION_NAME}}` yourself: `lbbexley` followed by the service name in PascalCase without spaces, for example `lbbexleyParkingPermitApplications`. Confirm it with the person.

If the dev environment URL doesn't look like a dev environment (for example it contains "prod" or "live"), stop and check. The harness must never point at production.

## 3. Fill in the files

- Replace every placeholder in `AGENTS.md` and `README.md`, and delete the note at the top of `README.md` that says this is the Bexley app template.
- Replace `{{SERVICE_NAME}}`, `{{SERVICE_OWNER}}` and `{{AUDIENCE}}` in each file in `docs/compliance/`. Leave the other `{{...}}` parts for the service team: they need real decisions, and `npm run check:release` won't pass until they're done.
- For documents that don't apply, replace the content under the title with one line saying why: for example `atrs-record.md` when there is no AI, or `publicity-check.md` for a staff-only tool.
- In `.mcp.json` and `.vscode/mcp.json`, replace `https://your-dev-environment.crm11.dynamics.com` with the dev environment URL if the whole team shares it. If each developer has their own, leave it, and tell the person to set the `DATAVERSE_DEV_URL` environment variable instead.

## 4. Turn on the Microsoft plugins this build needs

<!-- claude-only -->
In `.claude/settings.json`, add to `enabledPlugins` only the plugins that match the build types:

| Build type | Plugin |
|---|---|
| Canvas app | `"canvas-apps@power-platform-skills": true` |
| Power Pages site | `"power-pages@power-platform-skills": true` |
| Model-driven app | `"model-apps@power-platform-skills": true` |

Copilot Studio agents and flows don't need a Microsoft plugin; the Bexley skills cover them.
<!-- /claude-only -->
<!-- copilot: Skip this step in Copilot. Developers using Claude Code turn the Microsoft plugins on in `.claude/settings.json`; tell the person which ones match the build types: canvas-apps, power-pages or model-apps from the power-platform-skills marketplace. -->

## 5. Install the test tools

Run `npm install`, then `npm run test:a11y:install` to install the browser the accessibility tests use. If either fails (for example, no network), tell the person to run them later.

## 6. Finish

Tell the person, briefly:

1. What you filled in, and which compliance documents still need their input.
2. <!-- claude-only -->To restart Claude Code so the plugin changes load. For a canvas app, to run `/configure-canvas-mcp` once afterwards.<!-- /claude-only --><!-- copilot: That anyone using Claude Code should restart it so the plugin changes load. -->
3. To create the solution in the dev environment with the Bexley publisher (prefix `lbbexley`) and the solution name above.
4. That each page or screen they build goes into `tests/accessibility/targets.json`, and to run `npm run test:a11y:login` once there's something to sign in to.
5. To commit the set-up and open a pull request, then capture the requirements with `/lbbexley:requirements` (from a cleaned meeting transcript or their own requirement prompt in `docs/discovery/`), and start each feature with `/lbbexley:plan` in plan mode.
