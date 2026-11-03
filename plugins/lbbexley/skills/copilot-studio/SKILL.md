---
name: copilot-studio
description: Bexley standards for Copilot Studio agents - instructions, greeting, knowledge sources, generative answers settings, handover to a person, sensitive topics, authentication, publicity rules, testing and transcripts. Use when designing, writing instructions or topics for, reviewing or publishing a Copilot Studio agent, including agent source (.mcs.yml) edited in VS Code.
---

# Copilot Studio agents

An agent speaks for the council, so it follows the content-style, accessibility, publicity, data-protection and ai-transparency skills. This skill covers what's specific to agents.

## Design

- **One job.** Each agent has a clear, narrow purpose ("Answer questions about parking permits"), not "anything about the council".
- **Instructions.** Start from the template in [agent-instructions.md](agent-instructions.md) and fill in every bracketed part.
- **Greeting** (Conversation Start topic). Say it's an automated assistant, what it can help with, and how to reach a person. Keep it to 3 short sentences.
- **Handover.** The Escalate topic gives the service's real contact routes (phone, form, opening hours) or hands over to live chat. Trigger it when the person asks, when the agent can't help, and for complaints.
- **Sensitive topics.** Separate topics, not generative answers, for: risk to life ("If someone is in immediate danger, call 999"), safeguarding concerns about a child or adult, abuse, and distress. Each gives the official contact from bexley.gov.uk straight away. Never invent phone numbers: copy them from the council's site and record the page in the topic.

## Knowledge and generative answers

- Knowledge sources: council-controlled content only (specific bexley.gov.uk pages and approved documents). Turn off general knowledge and open web search, so answers come only from those sources.
- Keep content moderation at the default or stricter.
- Answers are short: 3 sentences or a short list, with a link to the source page.
- If the knowledge doesn't cover it, the agent says so and offers the handover. It never guesses.

## Safety and the law

- **Publicity.** No opinions on political questions, councillors or parties, and nothing about candidates in a pre-election period (publicity skill).
- **Advice.** No legal, medical, financial or safeguarding advice. Give the right contact instead.
- **Personal data.** Don't ask for more than the task needs, and never for bank or card details. Transcripts are stored in Dataverse, so agree retention with Information Governance and include the agent in the DPIA.
- **Authentication.** Public information agents need no sign-in. Agents that act on someone's records need authentication and a DPIA.
- **Transparency.** Fill in the ATRS record (`docs/compliance/atrs-record.md`) for any public agent (ai-transparency skill).

## Style

- Plain English, a reading age of about 9, British spelling, no emoji (the standards check rejects emoji in agent source), no exclamation marks, no filler such as "Great question".
- Adaptive cards use text black on white, real text rather than images, and alt text on any image.

## Source control

Agent source cloned with the Copilot Studio extension for VS Code (`.mcs.yml` files) lives under `src/` and is checked by the standards check. Review changes in pull requests, and publish only from the approved environment.

## Testing before publishing

Keep the test set in `tests/agent-test-set.md` with expected behaviour, and run it after every change (if your environment has Copilot Studio's agent evaluation feature, load the questions into it as a test set): normal questions, edge cases, the sensitive topics, political and election questions, complaints, nonsense, attempts to override the instructions, and requests for personal data. Then run `/lbbexley:review`.
