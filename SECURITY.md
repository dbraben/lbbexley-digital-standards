# Security

## Report a problem privately

If you find a way round a guardrail (the Dataverse guard, the personal-data guard, the commands the template denies) or a weakness in the workflows, don't open a public issue. Use **Report a vulnerability** on this repository's Security tab, or tell a maintainer named in `.github/CODEOWNERS` directly.

## Personal data

Real personal data in any repository, issue, pull request, log or screenshot is a data breach, however it got there.

1. Don't copy, forward or screenshot it.
2. Tell Information Governance straight away, using the council's data breach procedure. The council may need to report it to the ICO within 72 hours.
3. With a maintainer, remove it from the repository's history and ask GitHub to clear cached views. Deleting it in a new commit isn't enough.

## Secrets

The accessibility tests' saved sign-in (`.auth/a11y-state.json`), tokens and certificates must never be committed. The app template's `.gitignore` and deny rules keep them out. If one is committed, revoke it first (sign the account out of all sessions, or rotate the token), then remove it from the history.
