---
name: plan
description: How to plan a change to a Bexley service before building it - the plan template with the user need, the exact words users will read, acceptance criteria for accessibility, content and data, where in the dev environment it's built, the tests to add and the compliance documents to update. Use whenever you plan a feature, screen, page, flow, agent topic or table, and always in plan mode.
model: opus
---

# Plan before building

Work in three steps, each on the right model:

1. **Plan** on the strongest model. In Claude Code, `opusplan` uses Opus in plan mode. This skill also switches to Opus.
2. **Build** on the everyday model (Sonnet), once the person approves the plan.
3. **Check** on a smaller model: the end-of-run check runs automatically before the assistant finishes.

Put the hard thinking into the plan, so building is straightforward and the check finds nothing.

Read `docs/requirements.md` and `docs/architecture.md` first if they exist. When the change is one of the user stories, start from its user need and acceptance criteria, and name the story in the plan, with its issue if it has one. Save the plan in `docs/plans/`, named like `2026-11-02-first-screen.md`.

## Plan template

```markdown
# [Change] plan

## User need
As a [user], I need [thing] so that [outcome].
Who else is affected, including people using screen readers, magnifiers, voice control or a keyboard only.

## Approach
Components, screens, pages, flows, topics and tables involved. What's reused. What's out of scope.

## Words users will read
Headings, labels, hints, buttons, error messages and confirmations, written now in plain English
(content-style skill).

## Acceptance criteria
- Accessibility: the keyboard path, labels, headings, error handling, contrast, target sizes and reflow
  for this change (WCAG 2.2 AA)
- Content: the words above, reading age about 9 for public content
- Data: each personal data field and why it's needed; retention
- Publicity, equality and AI, where they apply

## Where it's built
The resource in the dev environment that changes (the app, flow, table or site, in the solution named
in AGENTS.md) and the tool that changes it. A new flow or table is added to the solution with
pac solution add-solution-component before the sync. The latest version comes into src/ through the sync.

## Tests
- Pages or screens to add to tests/accessibility/targets.json
- Questions to add to tests/agent-test-set.md (agents)
- Manual checks: keyboard, screen reader, 400% zoom, phone

## Compliance documents to update

## Risks and questions
```

## Rules

- Write the real words users will read in the plan. Placeholder text isn't a plan.
- Everything is built in the dev environment, never as files on their own: a canvas app with Microsoft's canvas tools, a flow with Microsoft's Power Automate plugin, tables and columns with the Dataverse MCP server, a Power Pages site with Microsoft's power-pages plugin. If the resource doesn't exist yet and only a person can create it (a blank canvas app with coauthoring on, say), say so in the plan.
- Every acceptance criterion must be something a person or a test can check.
- If the plan needs a decision someone else must make (Information Governance, Communications, the service owner), say so and don't assume the answer.
- Keep plans small. A change that needs more than a day of building is two plans.
