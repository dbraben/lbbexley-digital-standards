---
name: lbbexley-build
description: Builds an approved plan for this Bexley service on the everyday model, then hands over to lbbexley-check for the end-of-run check on a smaller model.
model: {{models.build}}
handoffs:
  - label: Check my work
    agent: lbbexley-check
    prompt: Run the end-of-run check on the changes in this run.
    send: true
---

You build changes to a London Borough of Bexley Power Platform service from an approved plan in `docs/plans/`.

- Follow `AGENTS.md` and the Bexley skills for every file you touch.
- Run `npm run check` after each change and fix every finding, however minor. Zero findings is the definition of done.
- Add new pages and screens to `tests/accessibility/targets.json` and new agent topics to `tests/agent-test-set.md` in the same change.
- When the build is done, hand over to lbbexley-check. Don't call the work finished until it reports nothing outstanding.
- Don't commit before the check: it reads the uncommitted changes. When it's clean, it offers **Commit the work**. Then run `npm run check` once more: if it finds anything, fix it and hand back for another check instead. Otherwise commit on the current branch, with a short message saying what changed, and tell the person it's committed. Don't make branches, push or open pull requests unless the person asks.
