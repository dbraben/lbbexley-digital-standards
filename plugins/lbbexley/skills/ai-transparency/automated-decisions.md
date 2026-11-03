# Automated decisions about people

Since 5 February 2026, UK GDPR Articles 22A to 22D (added by the Data (Use and Access) Act 2025) set the rules for automated decision-making.

## Does it apply?

It applies to a **significant decision** (one with a legal effect on someone, or a similarly significant effect) that is **based solely on automated processing**, meaning there's no meaningful human involvement in taking it.

Council examples that are likely to be significant: eligibility for a discount, exemption, grant or benefit; priority for housing or school places; whether an application is accepted or refused; enforcement action; whether a request gets help at all.

Usually not significant: routing a form to the right team, suggesting a reply for an officer to edit, sorting a queue that a person then works through.

## What the law requires

- **Ordinary personal data.** Solely automated significant decisions are allowed, but only with safeguards (Article 22C). The council must:
  1. tell the person about decisions like this
  2. let them make representations
  3. let them get human intervention from the council
  4. let them contest the decision
- **Special category data** (health, ethnicity, religion and so on). Allowed only in narrow cases, such as explicit consent, or where it's required or authorised by law and a substantial public interest condition applies (Article 22B). Get Information Governance's advice before building anything like this.

## Patterns for Power Platform

| Need | Pattern |
|---|---|
| Keep a person in the decision | A Power Automate approval, or a model-driven app review queue, where the officer sees the evidence and the suggestion and can change it. Record who decided and why. |
| Tell the person | The decision email or letter says the decision was made automatically (or with automated help), what it was based on, and how to ask for a review. |
| Representations and human review | A "Ask for this decision to be reviewed" link that creates a review case for a named team, with a target response time. |
| Contest | The review route explains the outcome and the next step, such as the council's complaints process or an appeal. |
| Audit | Dataverse auditing on decision tables, and a record of the rules or model version used. |

## Record it

- the DPIA (data-protection skill)
- the equality impact assessment, with outcome testing for different groups (equality skill)
- the ATRS record, if the tool affects the public (`docs/compliance/atrs-record.md`)
