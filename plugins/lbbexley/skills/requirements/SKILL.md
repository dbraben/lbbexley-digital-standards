---
name: requirements
description: Works out the requirements for a Bexley service in a conversation, and writes docs/requirements.md - users and their needs, user stories with priorities and acceptance criteria, rules, data, the duties that apply, what's out of scope and open questions. Asks a few questions at a time in the chat, or gives the questions as a table to take away and paste back later. Checks for personal data first and never invents answers. Use at the start of a project or a big change, before the architect and plan skills, and whenever the person pastes back a table that starts "Bexley requirements answers".
argument-hint: "[anything to start from, or the answers table pasted back]"
model: opus
---

# Requirements for a Bexley service

Every project starts from what the people who run and use the service actually said, not from assumptions. This skill gets it in a conversation, in the chat, and turns it into requirements the service owner can check, the architect skill can design from and the plan skill can plan from. The person never has to write or edit a file: you do that.

<!-- claude-only -->
If the session is in plan mode, ask the person to press Shift+Tab until it says **accept edits on** before you start: you save the requirements as you go.
<!-- /claude-only -->

## 1. Find what's already known

Read everything the project already holds before asking anything:

- `AGENTS.md`: the service details from the set-up.
- `docs/discovery/`: `service-introduction.md` (what the person said at set-up), cleaned meeting transcripts (`transcript-*.md`) and any notes. Skip `README.md`, and `requirements-questions.md`, which only holds the questions you gave.
- `docs/requirements.md`, if it exists: an earlier draft, with its open questions.
- Anything the person has said or pasted in this conversation.

Never read files outside the repository, and never read an original transcript, a recording or a `.roles.json` file.

## 2. Check for personal data first

Before anything else, read the material for anything that could identify a person: names used for anyone other than as a role, email addresses, phone numbers, addresses, full postcodes, reference or case numbers, or details of a particular person's situation. Check the person's answers in the chat the same way.

If you find any, stop. Say where, roughly (for example "the third paragraph from Speaker 2", or "your answer to question 5"), but don't repeat what you found. For a file, tell the person to clean it: `npm run transcript:clean` for a Teams transcript, then the checklist in the data-protection skill ([transcripts.md](../data-protection/transcripts.md)). For an answer, ask them to describe it again without the person, for example "a resident who rings several times". Write nothing down until it's clean.

## 3. Ask in the chat

Start with what you already know, in three or four short points, so the person can correct it. Then offer two ways to carry on, in a sentence each:

- **Answer here.** You ask two or three questions at a time and build on the answers.
- **Answer later.** You give the questions as a table to copy into an email, a Teams chat or a document, fill in with the service team, and paste back into the chat when it's done.

The questions are in [questions.md](questions.md). Ask only those the material doesn't already answer.

### Answering here

- Ask two or three questions at a time, never more, in plain words, each with a short example.
- After each answer, say in a line what you've noted, then ask the next ones. Ask a follow-up when an answer is vague, or describes a solution rather than a need: "We need a spreadsheet" is a solution; "we need to see every open request in one place" is the need.
- If they don't know, note it as an open question with who could answer it, and move on.
- They can switch at any time: if they say "give me the rest as a table", do that.

### Answering later

1. Save what you know so far: write the draft `docs/requirements.md` (step 4), with each unanswered question in its "Open questions" table, numbered Q1, Q2 and so on. Then the questions survive a new session.
2. Give the table in a code block, so it's easy to copy, and save the same table in `docs/discovery/requirements-questions.md`, which Git ignores, so the person can copy it from there instead. Its first line tells you what it is when it comes back:

   ```text
   Bexley requirements answers · <service name> · questions of <date>

   | # | Question | Answer |
   |---|---|---|
   | Q1 | <question> (for example: <short example>) | |
   ```

3. Tell the person: copy the table from the chat, or from `docs/discovery/requirements-questions.md`; fill in what you can and leave gaps for what nobody knows; describe people by role and never name them; keep the first line; and paste the whole table back into the chat in this repository. Any session will do.

When the person pastes a table that starts with "Bexley requirements answers", with or without other words around it, it's that table coming back. Check the service name matches `AGENTS.md`, then match each answer to its question in `docs/requirements.md`. Check the answers for personal data (step 2), ask about anything unclear in the chat, and carry on from step 4.

### Throughout

- Note who said what by role, where people disagreed, and anything that sounds like a rule ("we have to reply within 10 working days").
- Never invent a fact, a number, a policy or a legal requirement. A gap is an open question, with who could answer it.

## 4. Write the requirements

Write `docs/requirements.md` yourself, with these sections:

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
- Source: [for example "Conversation with the developer, 4 November 2026" or "Discovery meeting, 2 November 2026 (service manager)"]

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
Each source by type and date, for example "Discovery meeting, 2 November 2026 (cleaned transcript, not kept in the repository)".
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

## 5. Show the person, and save it

Don't send the person to the file. In the chat, show a short summary: the users and their main needs, the user stories as a list with their priorities, and the open questions with who can answer them. Ask what to change, and make the changes they ask for.

The person never commits it themselves. Don't commit yet: the end-of-run check reviews the uncommitted changes first. <!-- claude-only -->When it passes, it asks you to commit: commit `docs/requirements.md` then, on the branch the person is on, with a message such as "Add the requirements", and tell them it's committed.<!-- /claude-only --><!-- copilot: Offer **Check my work**. When lbbexley-check finds nothing outstanding, it offers **Commit the work**, which commits it. --> Don't make a branch, push or open a pull request unless they ask. The file holds no personal data, and `docs/discovery/` is never committed: Git ignores it.

Offer the summary as plain text the person can paste into an email or a Teams message for the service owner. When the owner agrees, record their role and the date in the status line: it's committed again the same way.

## 6. Issues, if they're wanted

Only if the person asks: draft one GitHub issue for each Must and Should story, using the fields of the repository's feature request form (`.github/ISSUE_TEMPLATE/feature_request.yml`): the title is the story's short name, then the user need, the acceptance criteria, and the duties it touches. Show the drafts first, and create them only when the person says so, one at a time with `gh issue create --title "<short name>" --body-file <file> --label enhancement`. Never put personal data in an issue.

<!-- copilot: In Copilot, the lbbexley-plan agent can't run commands. Hand over to lbbexley-build to create the issues, or create them by hand from the drafts. -->

## Next steps

Suggest them in this order:

1. The service owner checks the requirements.
2. `/lbbexley:architect` designs the service from them, then reconciles the configuration.
3. `/lbbexley:plan` plans the first Must story, once the open questions that block it are answered.
