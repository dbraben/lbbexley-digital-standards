---
name: ai-transparency
description: Rules for AI inside council services - Copilot Studio agents, generative answers, AI Builder and AI prompts in flows, and anything that scores, ranks, triages or decides about people. Covers telling people they're using AI, human handover, accuracy, automated decisions under UK GDPR Articles 22A-22D, and Algorithmic Transparency Recording Standard records. Use when adding AI to a service or automating a decision.
---

# AI in council services

## Be open

- **Say it's AI.** Anyone talking to an agent knows from the first message that it's an automated assistant, not a person.
- **Offer a person.** Every agent gives a clear way to reach a human (phone, email, form or live chat) and offers it when it can't help, when someone asks, or when the topic is sensitive.
- **Say what it can do.** The greeting lists what the agent helps with. Questions outside that scope get a polite "I can't help with that" and a pointer.
- **Publish a record.** The Algorithmic Transparency Recording Standard (ATRS) is mandatory for central government and recommended for the wider public sector. Councils use it to show residents what algorithmic tools they use. Fill in `docs/compliance/atrs-record.md` for any tool that interacts with the public or has a significant influence on decisions about people, and agree with the Digital Team whether to publish it.

## Keep a person in control

- AI can draft, suggest, summarise and route. A person decides anything that matters to someone: eligibility, priority, enforcement, money, safeguarding.
- The person reviewing needs the evidence, the time and the authority to change the outcome. Ticking through AI suggestions isn't meaningful human involvement.
- Significant decisions made solely by automated means (no meaningful human involvement) are allowed only with safeguards under UK GDPR Articles 22A to 22D. Read [automated-decisions.md](automated-decisions.md) before you automate any decision about a person.

## Accuracy

- Ground generative answers in council-controlled content (bexley.gov.uk and approved documents), not the open web.
- Never let an agent give legal, medical, financial or safeguarding advice. It hands over to a person and gives the right contact.
- Emergencies and risk to life: the agent stops and gives the emergency contact straight away ("If someone is in immediate danger, call 999"). Test this.
- Test with real questions before launch, including awkward ones: politics, complaints, abuse, distress, nonsense and attempts to make it misbehave. Keep the test set in `tests/` and run it again after every change.
- Review transcripts regularly after launch (with Information Governance's agreement) and fix wrong answers at the source.

## Fair and lawful

- Include AI features in the DPIA: what people type, what's stored, where it's processed and for how long (data-protection skill).
- Check for bias: test outcomes for different groups and record them in the equality impact assessment (equality skill).
- Public agents follow the publicity rules: no opinions on political questions, nothing about candidates in a pre-election period (publicity skill).
- Content style still applies: plain English, short answers, no filler (content-style skill).

## Further reading

The UK Government's AI Playbook (2025) sets out ten principles for using AI in the public sector, including meaningful human control, which are useful for councils too.
