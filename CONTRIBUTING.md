# Contributing to the Bexley digital standards

The Digital Team owns this repository. Anyone building Bexley services can suggest changes; maintainers decide, with the sign-offs in [GOVERNANCE.md](GOVERNANCE.md).

## Suggest a change

Open an issue with one of the forms:

- **Harness improvement**: something the standards should have caught, guidance a skill was missing, a template that had to change. Most of these arrive from app repositories through `/lbbexley:improve`, which turns the end-of-run check's ideas into proposals.
- **Standards check false alarm**: a finding that isn't a problem.

Never put personal data in an issue, a pull request or an example.

## Make a change

1. Branch from `main`.
2. Change what's needed:

   | To change | Edit | Also |
   |---|---|---|
   | A standard or how-to | `plugins/lbbexley/skills/<skill>/` | Cite the source. Keep `SKILL.md` short and put detail in linked files. Mark Claude-only passages with `<!-- claude-only -->` blocks. |
   | A mechanical rule | `plugins/lbbexley/scripts/lib/checks.js` | A test in `tests/checks.test.js` with a failing and a passing example, then `npm run rules-doc`. |
   | A path rule | `sync/rules/<area>.md` | Both Claude Code (`.claude/rules/`) and Copilot (`.github/instructions/`) get it from this one file. |
   | The plan, build and check agents for Copilot | `sync/copilot/agents/` | Model lists come from `copilotModels` in `config/standards.json`. |
   | A guardrail | `plugins/lbbexley/scripts/` and `hooks/hooks.json` | Tests in `tests/hooks.test.js`. Copilot's hooks are in `sync/copilot/hooks.json`. |
   | The transcript cleaner | `plugins/lbbexley/scripts/clean-transcript.js` and `scripts/lib/transcript.js` | Tests in `tests/transcript.test.js`, with made-up names and numbers built at run time. It must never print or keep a name inside the repository. |
   | The accessibility test runner | `sync/tests/accessibility/` | Sync it into a copy of the app template and run `npm run test:a11y` against a page that passes and one that fails before releasing. |

3. Run the checks:

   ```bash
   npm run verify
   claude plugin validate .
   claude plugin validate plugins/lbbexley
   ```

4. Open a pull request with the template, and get the sign-off GOVERNANCE.md lists for the area you changed.

Maintainers release changes as described in [docs/maintaining.md](docs/maintaining.md).
