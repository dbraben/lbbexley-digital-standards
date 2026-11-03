---
name: data-protection
description: UK GDPR and the Data Protection Act 2018 (as amended by the Data (Use and Access) Act 2025), cookies under PECR, FOI and records management, fictional test data, and cleaning meeting transcripts before they're used for requirements, applied to canvas apps, Power Pages, Copilot Studio, flows and Dataverse. Use when a build collects, stores, shows, shares, exports or deletes information about people, sets cookies or analytics, keeps records, needs test data, or starts from a meeting transcript.
---

# Data protection

## First rules

1. **Development and testing use fictional data only.** Never copy real resident or staff records into a dev or test environment, a prompt, a screenshot, a test file or a pull request. Safe formats: [test-data.md](test-data.md). The standards check rejects files that contain real-looking personal data<!-- claude-only -->, and the harness blocks prompts that contain it<!-- /claude-only -->.
2. **Data protection by design and by default is a legal duty** (UK GDPR Article 25). Build privacy in from the first screen, not at the end.
3. **New processing of personal data needs a DPIA screening**, and a full DPIA where it's likely to be high risk (Article 35). Fill in `docs/compliance/dpia-screening.md` in the app repository and send it to Information Governance before you build with real data.
4. **Meeting transcripts are cleaned before any assistant sees them.** The original stays outside the repository; `npm run transcript:clean` makes a copy with roles instead of names, and a person reads it all before it's used. Never read an original transcript, a recording or a `.roles.json` file. Details: [transcripts.md](transcripts.md).

## While you build

- **Collect only what you need.** Every field has a reason the service can explain. Don't ask for date of birth if "Are you over 18?" will do.
- **Lawful basis.** For most council services it's public task or legal obligation. Information Governance confirms it in the DPIA. Consent is rarely right for a council service, because people can't freely refuse.
- **Special category and criminal offence data** (health, ethnicity, religion, sexual orientation, disability, offences and similar) need extra conditions and an appropriate policy document. Flag them in the DPIA screening.
- **Privacy information at the point of collection** (Article 13). Link the service's privacy notice next to the first question and from the footer.
- **Security.** Least-privilege Dataverse security roles, column security for sensitive fields, auditing on tables with personal data, and apps shared with security groups, not "Everyone".
- **Power Pages table permissions.** Never give anonymous or global access to tables with personal data, and check what the Web API exposes. Misconfigured portals have leaked millions of records across the public sector.
- **Flows.** Turn on Secure inputs and Secure outputs for actions that handle personal data, so run history doesn't show it. No personal data in email subjects. Send each person their own email; never put residents in To or CC together.
- **Connectors.** Use only connectors the environment's data policy allows. Any non-Microsoft connector or HTTP call sends data to another organisation, so it needs a contract and must be in the DPIA.
- **Logs and telemetry.** Don't Trace(), log or display personal data in error messages.
- **AI features.** Agents and AI Builder prompts process what people type. Record them in the DPIA, and see the ai-transparency skill. Ask the Power Platform admins whether generative AI features in your environment can process data outside the UK, and record the answer.

## People's rights

Design so the service can respond to requests without heroics:

- **Find** everything about a person (search by name, email or reference).
- **Export** it for a subject access request. The council has one month, and the clock can now pause while it asks the requester to clarify (Article 12A, since 5 February 2026). Searches must be reasonable and proportionate.
- **Correct** and **delete** records, and apply the retention period automatically.
- **Complaints.** Since 19 June 2026 the council must make it easy to complain about its use of personal data, acknowledge complaints within 30 days and tell people the outcome (section 164A of the Data Protection Act 2018). Public services that collect personal data link to the council's data protection complaints route.

## Automated decisions

Significant decisions about people made solely by automated processing are allowed only with safeguards (UK GDPR Articles 22A to 22D, since 5 February 2026): telling people, letting them make representations, offering human intervention and a way to contest. Read the ai-transparency skill before building anything that decides, scores, ranks or triages people.

## More detail

- Cookies and analytics on public sites: [cookies.md](cookies.md)
- Fictional test data: [test-data.md](test-data.md)
- Meeting recordings and transcripts used for requirements: [transcripts.md](transcripts.md)
- Records, retention, FOI and EIR: [records-and-foi.md](records-and-foi.md)

## Who to ask

Information Governance and the council's Data Protection Officer for DPIAs, lawful basis, privacy notices, retention and data sharing.
