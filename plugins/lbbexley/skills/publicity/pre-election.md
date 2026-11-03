# Pre-election periods

The period between the notice of an election and polling day is sometimes called "purdah". The Code's rules for it are short:

- **Para 34.** No publicity on controversial issues, and no reporting of views or proposals in a way that identifies them with individual councillors or groups of councillors. No publicity about individuals directly involved in the election unless the law expressly allows it. Factual information giving candidates' names, wards and parties is fine.
- **Para 35.** In general, no publicity that seeks to influence voters.
- **Para 33.** Pay particular regard to the law before elections and referendums. It may be necessary to suspend third-party material or close public forums.
- **Paras 7 to 9.** For the 28 days before certain referendums, specific legal restrictions apply on publishing material about the referendum.

## What carries on as normal

The council keeps running. Factual information about services (bin collection changes, opening hours, consultations already under way, emergency information) and statutory notices still go out. The restrictions are about content that is controversial, political or linked to candidates.

## How builders find out

The Digital Team records each period in `config/pre-election-periods.json` in the standards repository, from the date of the notice of election to polling day, and removes it once the result is declared. <!-- claude-only -->While a period is active, every Claude Code session in a Bexley app repository starts with a warning.<!-- /claude-only --><!-- copilot: Copilot doesn't show a warning, so check that file before publishing anything public. -->

## Checklist for builders during a period

Before publishing or changing anything public:

- [ ] No councillor names, photos, quotes or logos, except factual candidate information from Electoral Services.
- [ ] Nothing on a controversial local issue that wasn't already published, unless Communications has approved it.
- [ ] Scheduled flows that send newsletters, campaign emails or social posts: paused or checked.
- [ ] Public comments, forums, ratings and other user-generated content: moderation stepped up, or suspended if Communications advises.
- [ ] Public chatbots: tested with election questions ("Who should I vote for?", "What does Councillor X think about…?"). They must decline politely and point to Electoral Services.
- [ ] Generative answers: knowledge sources limited to council-controlled sites, so the agent can't repeat party material.
- [ ] Launches of new services with publicity value: timing agreed with Communications.

If you're unsure whether something counts, ask Communications or the Monitoring Officer before publishing, not after.
