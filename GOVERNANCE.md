# Governance

## Ownership

| Role | Who | Responsible for |
|---|---|---|
| Owner | Digital Team | This repository, the app template, releases and the pilot |
| Maintainers | Named members of the Digital Team (listed in `.github/CODEOWNERS`) | Reviewing and merging changes, releasing versions |
| Brand sign-off | Communications | Brand skill, logo files, publicity skill |
| Accessibility sign-off | Digital Team accessibility lead | Accessibility skill and reviewer |
| Data protection sign-off | Information Governance and the Data Protection Officer | Data-protection skill, DPIA screening template, retention guidance |
| Legal sign-off | Legal Services and the Monitoring Officer | Publicity and pre-election guidance |
| Equality sign-off | The council's equality lead | Equality skill and impact assessment template |

## How changes are made

1. Open a pull request. Say what changed and why, with the source (a guideline, a law, a lesson from a build).
2. The checks run: tests, the rules document, the standards check on this repository, plugin validation, and a sync into an empty app repository.
3. A maintainer reviews it. Changes to a skill in the table above also need that area's sign-off, recorded in the pull request.
4. Bump the version in `.claude-plugin/marketplace.json`, `plugins/lbbexley/.claude-plugin/plugin.json` and `package.json`, and add an entry to `CHANGELOG.md`.
5. Merge, tag the release (for example `v0.3.0`), and tell developers what changed.

App repositories pin the pull request check and their synced files to a tag, so a release never changes their checks without a pull request of their own.

## How the harness improves itself

At the end of every piece of work, the end-of-run reviewer (a smaller, cheaper model) suggests improvements to the harness as well as checking the work. People decide what changes:

- The reviewer only reads files. Its ideas are written to `.lbbexley/improvements.md` in the app repository, which is reviewed in pull requests like any other file. Ideas that would fail the standards check, such as anything with personal data in it, are dropped.
- Developers work through the ideas with `/lbbexley:improve`. Changes to their own service are made there; ideas for the standards become "Harness improvement" issues in this repository. Nothing in this repository changes automatically.
- Maintainers triage the issues, check each against a source, and accept or decline them with a reason. Accepted ideas follow the process above, including the sign-offs.
- During the pilot, count ideas logged, accepted and declined. If the reviewer's ideas are mostly noise, change its instructions rather than letting the log grow.

## Pilot

**Scope.** 2 or 3 developers, 1 or 2 low-risk services, about 6 weeks. Start with a staff-facing canvas app or flow that uses no real personal data, then one public-facing build.

**What we'll measure.**

- Standards check: findings per pull request, and how quickly they fall
- End-of-run check: problems it finds that the standards check didn't, and how often the assistant stops with problems outstanding
- Suppressions: how many are added, and whether their reasons hold up in review
- Harness ideas: logged, accepted and declined
- Review findings: issues found by `/lbbexley:review` against those found later in testing
- Accessibility: issues found in manual testing (keyboard, screen reader, zoom)
- Time from starting a build to its first pull request
- Developers' views: what helped, what got in the way, which rules felt wrong

**Decision at the end.** Continue, change, or stop. Before any wider rollout, settle the risks and open decisions below.

## Risks

### Personal AI accounts

During the pilot, developers use AI subscriptions they pay for themselves (Claude Pro or Max, or individual GitHub Copilot plans). That creates risks the council needs to accept knowingly:

- **No agreement with the council.** Personal plans are covered by consumer terms. There's no data processing agreement between the council and the provider. Anthropic's data processing addendum is part of its commercial terms (Claude for Work and the API), not its consumer plans.
- **Model training.** Whether conversations and code can be used to improve the provider's models depends on each person's privacy settings. Onboarding tells developers to turn this off, but the council can't enforce or audit it.
- **No central control.** The council can't manage access, see usage, apply policies or remove access when someone leaves.
- **Cost and fairness.** Staff paying for work tools themselves may not be sustainable or fair, and may raise HR questions.

Controls in place for the pilot: dev environments only, fictional data only, the prompt guard on personal data, the Dataverse guard, commands that import, delete or deploy solutions denied, the standards check on every save, at the end of every run and on every pull request, and the privacy settings in onboarding.

**Recommendation.** Get Information Governance and the Data Protection Officer to approve the pilot on these terms, and move to a council-managed plan (such as Claude Team or Enterprise, or GitHub Copilot Business) before any wider rollout.

### Meeting transcripts

Teams transcripts of discovery meetings are the best source of requirements, and they're full of personal data: names, opinions and sometimes residents' details. With personal AI accounts, an uncleaned transcript must never reach an assistant.

Controls: the original stays outside the repository, and `npm run transcript:clean`, which the person runs, never the assistant, writes a copy with roles instead of names and with contact details and reference numbers removed. Names stay in a roles file next to the original. The cleaned copy goes in `docs/discovery/`, which Git ignores, and the template denies Claude Code the cleaner, `.vtt` files and roles files. The data-protection skill (`transcripts.md`) has the checklist a person follows before anything is used, and the requirements skill stops if it finds personal data. Tools can't recognise every name or someone's circumstances, so the person's read-through matters most.

**Recommendation.** Ask Information Governance to confirm the approach, including how long originals are kept and whether discovery meetings may be recorded for this purpose.

### Repository hosting

The repositories currently sit under a personal GitHub account (`dbraben`). For rollout, move them to a council GitHub organisation, so ownership, access and audit sit with the council, and update the references in the app template (`.claude/settings.json`, the workflow, CODEOWNERS).

### Over-trusting the tools

Automated checks and AI reviewers find many problems, but they can't confirm that a service is accessible, lawful or fair. Automated accessibility tests find only part of the WCAG failures a person would. Manual accessibility testing, testing with users, and sign-off from Information Governance and Communications are still required.

### Zero findings

Requiring zero findings of any severity keeps standards high, but a rule that fires wrongly blocks work, and people may suppress findings to get past it. Suppressions need a written reason and show up in pull request review, false alarms have their own issue form, and the pilot counts suppressions. Fix noisy rules quickly.

### GitHub Copilot hooks

Copilot's hooks, which run the guardrails and the end-of-run gate in Copilot, are a preview feature. Their behaviour and the information they pass to scripts may change, and there's no prompt guard for personal data in Copilot. The pull request check, which doesn't depend on any assistant, is the backstop. Try the hooks in a test repository after Copilot updates.

### Model names and availability

Claude Code's model tiers (`opusplan`, `opus`, `haiku`) follow Anthropic's current models automatically. Copilot's agents name models in order of preference (`copilotModels` in the config), and what's available depends on each person's Copilot plan and changes over time. Check the names at each release. On a personal plan, the stronger models use more of each person's allowance, which is one more reason to move to a council-managed plan.

## Open decisions

| Decision | Current harness default | Who decides |
|---|---|---|
| Primary button colour | Fuchsia with white text (7.2:1) | Digital Team and Communications |
| Link hover colour | Normal-size links keep #005EA5 on hover, with a thicker underline in CSS. The guide's #2B8CC4 is used on large text only, because it's 3.7:1 on white and 3.3:1 on the light greys, below the 4.5:1 normal-size text needs | Digital Team and Communications (a darker hover colour in the B:HIVE guide would settle it) |
| Confirmation panel colour | Spring with white text | Digital Team |
| Logo files and clear-space rules | PNG logo in the brand skill's assets; SVG and clear-space rules not yet supplied | Communications |
| Typo in the brand guide | "#0B0COC" treated as #0B0C0C | Digital Team (correct the B:HIVE page) |
| WCAG version in B:HIVE guides | Harness builds to WCAG 2.2 (B:HIVE still says 2.1) | Digital Team (update the B:HIVE page) |
| Sign-in for residents on Power Pages | Not set | Digital Team and Information Governance |
| Dataverse publisher choice value prefix | Not set | Digital Team (create the publisher once) |
| Retention of agent conversation transcripts | Not set | Information Governance |
| Recording discovery meetings, and how long original transcripts are kept | Originals deleted once the requirements are agreed; cleaned copies never committed | Information Governance |
| Publishing ATRS records | Recommended for public-facing AI | Digital Team and Information Governance |
| Repository visibility and licence | Not set | Digital Team |
