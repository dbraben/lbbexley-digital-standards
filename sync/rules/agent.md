---
description: Bexley rules for Copilot Studio agent source (.mcs.yml)
paths:
  - "**/*.mcs.yml"
  - "**/*.mcs.yaml"
---

# Copilot Studio agent source

Use the copilot-studio, ai-transparency, publicity and content-style skills. These rules always apply:

- The agent says it's an automated assistant and offers a way to reach a person.
- Answers come only from council-controlled knowledge. No opinions on political questions, parties or councillors.
- Sensitive topics (danger to life, safeguarding, distress) are fixed topics with official contacts copied from bexley.gov.uk. Never invent contact details.
- Plain English, short answers, no emoji. Adaptive card images have altText.
- New topics go into `tests/agent-test-set.md` in the same change.
