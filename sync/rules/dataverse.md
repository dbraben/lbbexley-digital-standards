---
description: Bexley rules for Dataverse solution source
paths:
  - "src/solution/**/*.xml"
---

# Dataverse solution source

Use the dataverse and data-protection skills. These rules always apply:

- The Bexley publisher, prefix `lbbexley`. Never the default publisher.
- Plain-English, singular display names and a description on every table and column.
- Least-privilege security roles per persona; auditing on tables with personal data; column security for sensitive fields.
- Retention built in from the start (bulk deletion, retention policy or a scheduled flow).
