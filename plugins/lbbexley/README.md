# lbbexley plugin

London Borough of Bexley standards for building Power Platform services with Claude Code: canvas apps, Power Pages sites, Copilot Studio agents, Power Automate flows, Dataverse and model-driven apps. It turns the council's brand guide, accessibility guides and legal duties into skills the assistant loads when they're relevant, adds read-only reviewers, and adds guardrails that check work as it's written and before the assistant finishes.

## Install

Claude Code offers to install it when you trust a folder made from the Bexley app template. To install it yourself:

```text
/plugin marketplace add dbraben/lbbexley-digital-standards
/plugin install lbbexley@lbbexley-digital
```

## Skills

| Skill | Covers |
|---|---|
| `brand` | Colours, Lato typography, links, focus and error styles, identity; tokens for canvas apps and CSS |
| `accessibility` | WCAG 2.2 AA and the council's accessibility guides, by platform, with testing |
| `content-style` | Plain English, house style, words to avoid, patterns for buttons, errors and emails |
| `publicity` | The Code of Recommended Practice on Local Authority Publicity, councillors, third-party content, pre-election periods |
| `data-protection` | UK GDPR and DPA 2018 as amended in 2025, cookies, test data, records and FOI |
| `equality` | The Public Sector Equality Duty, inclusive forms, impact assessments |
| `ai-transparency` | AI in services, human oversight, automated decisions, ATRS records |
| `canvas-apps`, `power-pages`, `copilot-studio`, `power-automate`, `dataverse` | Bexley build standards for each platform |
| `architect` | `/lbbexley:architect`: requirements or a transcript to a solution architecture with duties and a diagram (runs on Opus) |
| `plan` | `/lbbexley:plan`: the plan for a change, with the words users will read and acceptance criteria (runs on Opus) |
| `quality-checks` | Every check, the command for it and when to run it |
| `review` | `/lbbexley:review`: the definition of done before a pull request |
| `improve` | `/lbbexley:improve`: works through the harness improvement ideas from the end-of-run check |
| `new-app` | `/lbbexley:new-app`: sets up a repository made from the app template |

## Agents

All three only read files.

| Agent | Model | Used by |
|---|---|---|
| `lbbexley:accessibility-reviewer` | Sonnet | The review: WCAG 2.2 AA and the Bexley rules |
| `lbbexley:compliance-reviewer` | Sonnet | The review: content style, brand, data protection, publicity, equality and AI transparency |
| `lbbexley:end-of-run-reviewer` | Haiku | The end-of-run gate: reviews this run's changes and suggests harness improvements |

## Guardrails

These run only in Bexley app repositories (where `AGENTS.md`, `CLAUDE.md` or the project's Claude settings mention lbbexley), so the plugin stays quiet in other projects.

| When | What happens |
|---|---|
| Session start | A short reminder of the rules and how work runs; a prompt to run `/lbbexley:new-app` if set-up isn't finished; a nudge when improvement ideas are waiting; a warning during a pre-election period |
| Prompt sent | Prompts containing real-looking NI, NHS or card numbers or personal email addresses are stopped (add `[fictional]` for made-up data) |
| Dataverse MCP tool | Schema tools run; tools that read or change records ask first; deletes are blocked |
| File saved | The standards check runs on the file. Every finding, however minor, goes back to the assistant to fix |
| The assistant tries to finish | The end-of-run gate: the standards check on every file changed in the run, problems the reviewer reported that haven't been fixed, and a review of new changes by the end-of-run reviewer. Plan mode is left alone. It stops and tells you what's outstanding when standards problems survive three attempts, when the assistant explains a reviewer's problem rather than fixing it, or after five reviews in one request (the rest are reviewed at the end of the next one) |
| A subagent finishes | When it's the end-of-run reviewer, its findings are recorded for the gate and its harness ideas are added to `.lbbexley/improvements.md` |

## Settings

| Environment variable | Effect |
|---|---|
| `LBBEXLEY_ALWAYS` | `1` turns the guardrails on in any folder; `0` turns them off |
| `LBBEXLEY_END_OF_RUN` | `0` skips the end-of-run review (the standards check at the end of the run still runs) |
| `LBBEXLEY_REVIEW_ROUNDS` | Most end-of-run reviews in one request (default 5) |
| `LBBEXLEY_ELECTIONS_FILE` | Use a different pre-election periods file |

The plugin also connects the Microsoft Learn MCP server, so the assistant can check Microsoft's current documentation.

## Privacy

The skills, agents and guardrails run on your computer and send nothing anywhere themselves. The guardrails' state (which files changed, what the end-of-run reviewer reported) stays in the app repository's `.lbbexley/state/` folder, which isn't committed. The Microsoft Learn MCP server sends the assistant's documentation searches to Microsoft, under the [Microsoft Privacy Statement](https://privacy.microsoft.com/privacystatement). Never put personal data in prompts: what the assistant sends to its model provider is covered by your own AI account's terms (see GOVERNANCE.md in the standards repository).

Requires Node.js 22 or later. The end-of-run gate also uses Git, when it's there, to find files changed by commands rather than by the assistant's edits.
