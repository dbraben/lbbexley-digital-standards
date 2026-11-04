---
name: requirements
description: Turns a cleaned meeting transcript, discovery notes or the person's own requirement prompt into docs/requirements.md for a Bexley service - users and their needs, user stories with priorities and acceptance criteria, rules, data, the duties that apply, what's out of scope and open questions - and drafts GitHub issues from the stories. Checks the material for personal data first and never invents answers. Use at the start of a project or a big change, before the architect and plan skills.
argument-hint: "[cleaned transcript, notes or requirement prompt]"
model: opus
---

# Requirements for a Bexley service

Every project starts from what the people who run and use the service actually said, not from assumptions. This skill turns their words into requirements the service owner can check, the architect skill can design from and the plan skill can plan from.

## 1. Find what's already known

Read everything the project already holds before asking anything:

- `AGENTS.md`: the service details from the set-up.
- `docs/discovery/`: cleaned transcripts (`transcript-*.md`), notes, `service-introduction.md` and `requirement-prompt.md`. Skip `README.md`.
- `docs/requirements.md`, if it exists. This is a re-run.
- Anything the person named or pasted in this conversation.

Then summarise what you already know, in a few short points, and say what's missing or contradicts. Ask only about those gaps and contradictions. Never ask again for something the person has already said.

If there's no material at all, ask the person to describe the project in their own words. Offer to create `docs/discovery/requirement-prompt.md` from [requirement-prompt.md](requirement-prompt.md) for them to fill in, and wait until they have. [requirement-prompt-example.md](requirement-prompt-example.md) shows the level of detail that helps; never treat the example as their project.

Never read files outside the repository to look for more, and never read an original transcript, a recording or a `.roles.json` file.

## 2. Check for personal data first

Before anything else, read the material for anything that could identify a person: names used for anyone other than as a role, email addresses, phone numbers, addresses, full postcodes, reference or case numbers, or details of a particular person's situation.

If you find any, stop. Say which file and roughly where (for example "the third paragraph from Speaker 2"), but don't repeat what you found. Tell the person to clean it: `npm run transcript:clean` for a Teams transcript, then the checklist in the data-protection skill ([transcripts.md](../data-protection/transcripts.md)). Write nothing until they have.

## 3. Understand it

- Separate what people **need** from the solutions they suggest. "We need a spreadsheet" is a solution; "we need to see every open request in one place" is the need.
- Note who said what by role, where people disagreed, and anything that sounded like a rule ("we have to reply within 10 working days").
- Ask the person about what's missing, in one go, and only what changes the requirements. Skip any question the material already answers:
  - Who uses it, on what device, and does anyone need a non-digital route?
  - How many: requests, users, records, and when are the peaks?
  - Which rules apply: legislation, council policy, eligibility, service levels? Where are they written down?
  - What information about people does it need, and why?
  - Does it decide anything about people (eligibility, priority, money, enforcement)?
  - Which systems does it read from or write to?
  - What does "done" look like for the service owner?

  If they can't answer, record it as an open question with who could answer it. Never invent a fact, a number, a policy or a legal requirement.

## 4. Write the requirements

Save `docs/requirements.md` with these sections:

```markdown
# Requirements: [service name]

Status: draft, not yet agreed. Last updated [date].
Agreed by: [role of the service owner, or "not yet agreed"]. Agreed on: [date, or "not yet agreed"].

## Summary
What the service lets people do, and why it matters, in three or four sentences.

## Users and their needs
| User (by role) | What they need | How they do it today |

## User stories

### R1. [Short name]
As a [user], I need [thing] so that [outcome].
- Priority: Must, Should, Could or Won't (this time)
- Acceptance criteria:
  - [ ] [Something a person or a test can check]
  - [ ] Works with a keyboard and a screen reader, and at 400% zoom
- Source: [for example "Discovery conversation, 2 November 2026 (service manager)"]

## Rules and constraints
Each with its source: the law, the policy, or who said it.

## Data
Each kind of information about people, why it's needed, and how long it's kept.

## Duties that apply
Accessibility always; data protection, equality, publicity, AI transparency and records where they apply, with a line on why.

## Out of scope

## Open questions
| # | Question | Who can answer | Blocks the first story? |

## Glossary
Service terms and what they mean.

## Sources
Each source by type and date, for example "Discovery conversation, 2 November 2026 (cleaned transcript, not kept in the repository)".
```

Rules for writing them:

- One need per story, small enough to plan and build in a day or two. Split anything bigger.
- Every acceptance criterion must be checkable. Include accessibility and content criteria, not just function.
- Write anything users will read in plain English (content-style skill).
- Summarise what people said. Quote only short phrases, attributed by role, never by name.
- Mark assumptions as assumptions, and put them in open questions too.
- Keep story IDs stable. A re-run amends the document: it keeps every existing `R` number, keeps decisions already made, and adds new stories at the end. A story that's dropped is marked "withdrawn", not deleted, so its number isn't reused.
- Record the status honestly. "Draft" means the content is written; only the service owner's agreement makes it agreed. Never write "agreed" on the person's behalf.
- Say which open questions block the first Must story. Only those need an answer before planning starts.
- The duties section feeds the architect skill: say which apply and why, and leave the design to the architect.

## 5. Check and share

Tell the person to ask the service owner to check the requirements, especially the priorities and the open questions, before anything is built. When the owner agrees, the person updates the status line with the owner's role and the date, and commits. Commit `docs/requirements.md`: it holds no personal data. The material in `docs/discovery/` is never committed: Git ignores it, but approved AI tools may still read and process its contents, so it's cleaned before it goes there.

## 6. Issues for the backlog

When the person asks, draft one GitHub issue for each Must and Should story, using the fields of the repository's feature request form (`.github/ISSUE_TEMPLATE/feature_request.yml`): the title is the story's short name, then the user need, the acceptance criteria, and the duties it touches. Show the drafts first. Create them only when the person says so, one at a time with `gh issue create --title "<short name>" --body-file <file> --label enhancement`, or let them create the issues by hand. Never put personal data in an issue.

<!-- copilot: In Copilot, the lbbexley-plan agent can't run commands. Hand over to lbbexley-build to create the issues, or create them by hand from the drafts. -->

## Next steps

Suggest them in this order:

1. The service owner checks the requirements and records their agreement in the status line.
2. `/lbbexley:architect` designs the service from them, then reconciles the configuration.
3. Create the issues, then `/lbbexley:plan` plans the first story, starting with a Must, once the questions that block it are answered.
