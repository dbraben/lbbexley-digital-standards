---
description: Bexley rules for Power Automate flow definitions
paths:
  - "**/Workflows/*.json"
  - "**/workflows/*.json"
---

# Power Automate flow definitions

Use the power-automate, data-protection and content-style skills. These rules always apply:

- Every flow, however small: a Try scope and a Catch scope (plus a Finally scope where tidy-up must always happen). The Catch scope runs after both Failed and Timed out and alerts the support team without personal data.
- Secure inputs and Secure outputs on actions that handle personal data.
- Mailboxes, URLs and IDs come from environment variables (prefix `lbbexley_`), never hard-coded.
- Rename every action to say what it does. One email per person, sent from a shared mailbox, with no personal data in the subject.
- Email templates follow the accessibility skill: real text, headings, alt text on images.
