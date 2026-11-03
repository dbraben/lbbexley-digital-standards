---
name: equality
description: Equality Act 2010 duties for council builds - the Public Sector Equality Duty, reasonable adjustments, equality impact assessments, inclusive forms (names, sex and gender, titles, addresses), equality monitoring questions, non-digital routes and bias in automated tools. Use when designing a new service or form, changing who can use a service or how, asking about people's characteristics, or automating decisions.
---

# Equality

## The duties

- **Public Sector Equality Duty** (section 149 of the Equality Act 2010). In everything it does, including designing digital services, the council must have due regard to the need to:
  - eliminate discrimination, harassment and victimisation
  - advance equality of opportunity
  - foster good relations between people who share a protected characteristic and those who don't
- **Protected characteristics:** age, disability, gender reassignment, marriage and civil partnership, pregnancy and maternity, race, religion or belief, sex and sexual orientation.
- **Reasonable adjustments** (sections 20 and 29). Service providers must anticipate the needs of disabled people, not wait for complaints. Accessible design is the main way a digital service does this, and the accessibility skill covers it.

## Show due regard: the equality impact assessment

Due regard has to happen before decisions are made, and it should be recorded. For a new service, or a change in how people reach one, fill in `docs/compliance/equality-impact.md` in the app repository: who uses the service, who might be disadvantaged by the change, and what reduces that. Use the council's full equality impact assessment template when the service owner or the screening says so.

## Not digital only

Some people can't or won't use online services: older residents, disabled people, people on low incomes, people with low literacy or limited English, and people without a device or data. For every public service:

- keep another way in (phone, in person, or assisted digital help), and say so on the start page
- never make the online route the only way to get a statutory service
- don't require an email address if a phone number or post would do

## Inclusive forms

- **Names.** One "Full name" field is most inclusive. If you need separate fields, label them "First name" and "Last name", allow single names, accents, apostrophes and hyphens, and don't set short length limits.
- **Titles.** Make them optional, or leave them out.
- **Sex and gender.** Ask only if the service genuinely needs it, and explain why. Use the Office for National Statistics' current harmonised wording, and agree it with the service owner and Information Governance.
- **Dates of birth.** Ask for them only when age matters. "Are you 18 or over?" is often enough.
- **Addresses.** Let people enter an address manually if the lookup can't find it. Allow for people with no fixed address where the service could apply to them.
- **Languages.** Plain English first (content-style skill). Offer interpreting or translation for services where language could be a barrier.
- **No CAPTCHAs** that rely on seeing, hearing or solving puzzles.

## Equality monitoring questions

- Keep them separate from the service questions and optional, with "Prefer not to say" on each.
- Explain why you're asking and that answers won't affect the service.
- Use the Office for National Statistics' harmonised categories so results can be compared.
- These answers are special category data: include them in the DPIA (data-protection skill) and store them apart from case data where possible.

## Automated tools and AI

Rules, scores and AI models can discriminate indirectly, for example by using postcode as a stand-in for ethnicity or income. Before building anything that decides, ranks or triages people, read the ai-transparency skill, test outcomes for different groups, and record the results in the equality impact assessment.
