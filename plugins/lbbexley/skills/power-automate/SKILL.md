---
name: power-automate
description: Bexley standards for Power Automate cloud flows - solutions, naming, connection references and environment variables, error handling, personal data in run history, emails to residents, ownership, performance and approvals. Use when creating, editing or reviewing a flow, or flow definition JSON in a solution.
---

# Power Automate

## Set-up

- **Solution-aware flows only**, in a solution with the `lbbexley` publisher. Flows outside solutions can't be deployed through the pipeline.
- **Connection references** for every connector, and **environment variables** (prefix `lbbexley_`) for anything that changes between environments: mailboxes, site URLs, list names, team IDs. The standards check flags hard-coded tenant URLs and mailboxes.
- **Ownership.** Flows that run a service are co-owned by the service team and run under a service account's connections, not one person's. A flow that stops when its maker leaves is a service failure.
- **Connectors.** Only those the environment's data policy allows. Anything new that sends data outside Microsoft 365 goes in the DPIA first (data-protection skill).

## Naming

- **Flow:** "Service: what it does", for example "Parking permits: send application receipt".
- **Actions:** rename every action to say what it does, for example "Get the booking" rather than "Get a row by ID 2". Reviewers and the people who support the flow read these names.

## Error handling (enforced)

Use the Try, Catch and Finally pattern for any flow with more than a couple of actions:

1. **Try** scope: the work.
2. **Catch** scope, set to run after Try has failed or timed out: notify the support team's shared channel or mailbox with the flow name, run link and failed action (no personal data), then Terminate with status Failed.
3. **Finally** scope (optional): tidy-up that must always happen.

The standards check warns when a flow with 3 or more actions has nothing that runs after a failure.

## Personal data

- Turn on **Secure inputs** and **Secure outputs** for actions that read or send personal data, so it doesn't appear in run history.
- Use filter queries and select only the columns you need, rather than fetching whole tables.
- No personal data in email subjects, Teams messages to group channels, or error notifications.

## Emails to residents and staff

- Send from the service's shared mailbox (stored in an environment variable), never a personal one.
- One email per person. Never put residents together in To or CC.
- Write them with the content-style skill's email pattern and the accessibility skill's `documents-and-email.md`: real text, headings, link text that makes sense, the logo with alt text.

## Reliability and performance

- Use the trigger's conditions or filter so the flow only runs when it needs to.
- Watch Dataverse and connector limits: use pagination thresholds and concurrency control in Apply to each, and avoid loops that call the same API thousands of times.
- Make flows safe to re-run: check whether an email was already sent or a record already created before doing it again.
- Use child flows for logic that several flows share.

## Decisions about people

Use Approvals or a review queue when a flow's outcome affects someone's eligibility, priority, money or case, so a person decides. See the ai-transparency skill before automating any decision about a person, and before using AI Builder or AI prompts in a flow.

## Before you call it done

Test with fictional data (data-protection skill, `test-data.md`), including the failure path: force an action to fail and check the Catch scope works. Then run `/lbbexley:review`.
