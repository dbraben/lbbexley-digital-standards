---
name: architect
description: Turns the requirements (docs/requirements.md), a use case or a cleaned discovery meeting transcript into a Power Platform solution architecture for a Bexley service - who uses it, which components, how data flows, which legal and accessibility duties apply, and a Mermaid diagram. Use at the start of a new service or a major change, or when asked which Power Platform components to use.
argument-hint: "[requirements, use case or cleaned transcript]"
model: opus
---

# Solution architecture for a Bexley service

This runs on the strongest model, before any planning or building. It follows the same approach as the open-source power-platform-architect skill (understand the need, ask what's missing, choose components, tell the story, draw it), with the council's duties built in from the start.

## Before you start

- If `docs/requirements.md` exists, design from it: its users, stories, rules, data and open questions are your starting point. If it doesn't, suggest `/lbbexley:requirements` first for anything bigger than a single change.
- Work from roles and teams ("residents", "the team that runs the service"), never people's names or case details. Transcripts must be cleaned first (`npm run transcript:clean`, then the checklist in the data-protection skill). If the material includes personal data, stop and ask for a cleaned version, without repeating what you found.

## How to work

Don't label your answer with step names: the person just needs the architecture.

1. **Understand the need.** Start from the requirements if there are any. Who the users are (residents, businesses, partners, staff teams) and what devices they use. How the process works now and where it hurts. Volumes, deadlines and seasonal peaks. Data sources and systems to connect to. What starts the process.
2. **Ask what's missing.** Ask the person, in one go, only what changes the design:
   - Who uses it, and on what device? Does anyone need a non-digital route?
   - What personal data is involved? Any special category data (health, ethnicity, religion and so on)?
   - Does the service decide anything about people (eligibility, priority, money, enforcement)? Who decides?
   - Will the public see it? Does it involve AI or chat?
   - Does anyone pay for anything? Which council systems does it need (finance, case management, SharePoint, on-premises databases)?

   If they can't answer, state your assumptions clearly and carry on.
3. **Choose components.** Each one must earn its place:

   | Need | Usually |
   |---|---|
   | Residents, businesses or partners online | Power Pages, with GOV.UK-style patterns |
   | Staff case work, review and data entry | Model-driven app (accessible by default) |
   | A task-focused or mobile staff app | Canvas app |
   | Storing data | Dataverse, with security roles, auditing and retention |
   | Moving data between people and systems | Power Automate cloud flows (desktop flows only where there's no API) |
   | Answering questions in conversation | Copilot Studio, grounded in bexley.gov.uk, with a way to reach a person |
   | Reading forms and documents | AI Builder, with a person checking the results |
   | Reporting | Power BI (accessible reports, no personal data in shared ones) |
   | On-premises systems | The on-premises data gateway, managed by the Digital Team |
   | Payments | The council's payment provider. Never take card details in the Power Platform |

   Flag licensing questions (premium connectors, Power Pages capacity, Copilot Studio messages) for the Digital Team rather than guessing costs.
4. **Tell the story.** Describe the process step by step as data moves through it: who does what, in which interface, and what happens next. Name the audience at every step, by team or role. Include the non-digital route and what happens when things go wrong.
5. **Duties by design.** For each duty that applies, say why and which document records it:

   | Duty | Applies when | Record |
   |---|---|---|
   | Accessibility (WCAG 2.2 AA) | Always | `docs/compliance/accessibility-statement.md` |
   | Data protection | Any personal data | `docs/compliance/dpia-screening.md` |
   | Equality | New service, or a change in who can use it or how | `docs/compliance/equality-impact.md` |
   | Publicity | The public, businesses or partners see it | `docs/compliance/publicity-check.md` |
   | AI transparency and automated decisions | AI, or decisions about people | `docs/compliance/atrs-record.md` |
   | Records and retention | Any records kept | `docs/compliance/retention.md` |

6. **Risks and open questions.** Assumptions you made, what could go wrong, and the decisions someone else must make.
7. **Draw it.** A simple Mermaid diagram: audiences, the interfaces they use, Dataverse, flows and outside systems. Show the non-digital route. Keep it readable.

## Reconcile the configuration

The set-up left some technical choices provisional: the Microsoft plugins, the build types, the compliance documents marked "to be confirmed", and the environment. Once the design is saved, bring them into line with it. A change of design can change all of these: moving from an internal canvas app to a public Power Pages service, for example, changes the plugins, the accessibility testing, the publicity and data protection documents, and the test targets.

Go through this list and record what you did:

| Item | Reconcile it with the design |
|---|---|
| Build types in `AGENTS.md` and `README.md` | The components in the design, replacing "not decided yet" |
| Microsoft plugins (`.claude/settings.json`) | Only the plugins for the components the design uses (Claude Code only; Copilot: tell the person which ones) |
| Compliance documents in `docs/compliance/` | Every document that applies, with its content filled in. Each document that doesn't apply says why. Nothing left as "to be confirmed" |
| Accessibility test targets (`tests/accessibility/targets.json`) | One entry for each screen or page the design adds |
| Agent test set (`tests/agent-test-set.md`) | Questions for each agent the design adds |
| Environment (`.mcp.json`, `.vscode/mcp.json`, the solution) | The dev environment, if there is one, and the solution name. If there's still no environment, record that the environment is still to be set up |
| "Built with" in `AGENTS.md` | The final list of components |

Then say what changed, and anything still open. If a change to the design would change the duties in the requirements, say so and suggest the person checks the requirements again.

## Save it

Write the result to `docs/architecture.md` with these sections: The need, Users and how they reach the service (a table of audience, interface and purpose, including the non-digital route), Components (a table of component and role), How it works, Duties by design, Risks and open questions, and Diagram (in a ```mermaid block, which GitHub and VS Code show as a picture).

Don't commit yet: the end-of-run check reviews the uncommitted changes first. <!-- claude-only -->When it passes, it asks you to commit: commit `docs/architecture.md` and the files the reconciliation changed then, on the branch the person is on, with the message "Design the service", and push it.<!-- /claude-only --><!-- copilot: Offer **Check my work**. When lbbexley-check finds nothing outstanding, it offers **Commit the work**, which commits and pushes the design. --> Don't make a branch or open a pull request unless the person asks.

Then suggest the next step: `/lbbexley:new-app` if the repository isn't set up yet, then `/lbbexley:plan` for the first story in `docs/requirements.md`.
