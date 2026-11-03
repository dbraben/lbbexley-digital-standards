---
name: quality-checks
description: The routine quality checks for a Bexley app repository and the commands that run them - the standards check, runtime accessibility tests with Playwright and axe, the release check, and the manual checks in Power Apps and the maker portal. Use when asked to run tests or checks, to validate changes, or before handing work over.
---

# Quality checks

Bexley's definition of done is zero findings of any severity. Never weaken a check to make it pass: don't delete test targets, loosen settings or add suppressions without a written reason.

## Commands

| Check | Command | When |
|---|---|---|
| Standards check, changed files | `npm run check` | After any change. It also runs automatically on every save and before the assistant finishes |
| Standards check, whole repository | `npm run check:all` | Before a pull request |
| Accessibility tests (WCAG 2.2 AA) | `npm run test:a11y` | After any change people see |
| Sign in for the accessibility tests | `npm run test:a11y:login` | First time, and when the saved sign-in expires |
| Install the test browser | `npm run test:a11y:install` | Once per machine |
| Release check | `npm run check:release` | Before go-live: compliance documents complete |

The accessibility tests open every page and screen listed in `tests/accessibility/targets.json` and check for:

- axe violations against WCAG 2.2 A and AA, of any impact
- sideways scrolling at 320 pixels wide (pages)
- a visible focus indicator on every tab stop (pages)

When you add a page or screen, add it to `targets.json` in the same change. The test code comes from the Bexley standards, in `.lbbexley/standards/tests/accessibility/`: never edit it in the app repository. Propose changes with the improve skill.

## Checks a person runs

- **Canvas apps:** App checker in Power Apps Studio shows no accessibility issues.
- **Before release:** Solution checker in the maker portal (Solutions, select the solution, Solution checker, Run) shows no issues.
- **Keyboard and screen reader:** every changed journey (accessibility skill, `testing.md`).

## Reporting

Say exactly what you ran and what it found. If a check couldn't run (no sign-in, no network, no targets yet), say so. Never report a check as passed when it didn't run.
