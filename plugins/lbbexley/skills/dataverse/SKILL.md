---
name: dataverse
description: Bexley standards for Dataverse and model-driven apps - publisher and prefix, table and column design, naming, security roles, auditing, retention, solutions and ALM, the Dataverse MCP server, and model-driven forms, views and theming. Use when designing tables or columns, setting security, building or reviewing a model-driven app, working with solutions, or using the Dataverse MCP tools.
---

# Dataverse and model-driven apps

## Publisher and solutions

- Every customisation goes in a solution owned by the Bexley publisher, prefix **`lbbexley`**. The publisher is created once by the Digital Team and imported into each dev environment. Don't create your own, and never use the Default solution or the default publisher. The standards check rejects solutions with another prefix.
- One solution per service, with a clear unique name such as `lbbexleyParkingPermits`.
- **Environments.** Build in dev. Test and production receive managed solutions through the pipeline, with approval. Never customise test or production directly.
- Build in the dev environment. After every change, the solution is synced into `src/solution` (pac solution sync), reviewed, committed and pushed. Never edit the synced files by hand.
- **Put each new table in the solution yourself.** The Dataverse MCP server creates tables outside the service's solution, so `pac solution sync` won't see them until they're added: `pac solution add-solution-component --solutionUniqueName <solution in AGENTS.md> --component <table logical name> --componentType 1 --AddRequiredComponents`. Then sync. Check the synced table's schema name starts with `lbbexley_`: a table that got another prefix was created with the wrong publisher. Deletes aren't allowed through the assistant, so tell the person, who removes it in Power Apps and creates it again with the service's solution set as their preferred solution.

## Tables and columns

- **Use standard tables** where they fit (Contact, Account, Activity) instead of creating copies.
- **Names.** Singular, plain-English display names ("Permit application"). Schema names are lower case with the prefix: `lbbexley_permitapplication`, `lbbexley_startdate`. Give every table and column a description: it's what makes reports, FOI searches and future changes possible.
- **Primary name column** says what the record is, such as a reference number.
- **Choices.** Global choices for lists used in more than one place. Labels in sentence case, in plain English.
- **Only what's needed.** Each column holding personal data has a purpose recorded in the DPIA (data-protection skill).
- **Sensitive columns** (health, safeguarding, financial) use column security profiles.

## Security

- Security roles per persona (for example "Permits officer", "Permits manager"), with least privilege. Don't hand out System Administrator or System Customizer to make something work.
- Grant access through teams linked to security groups, not to individuals.
- Turn on **auditing** for tables with personal data, and record changes to decision fields.
- Control **Export to Excel** through the security role, and limit it for tables with personal data.

## Retention

Set disposal up when you create the table: a bulk-deletion job, a retention policy, or a flow that deletes or anonymises records when their retention period ends. Record the period in `docs/compliance/retention.md` (data-protection skill, `records-and-foi.md`).

## Model-driven apps

- Keep Microsoft's standard forms, controls and theme. They're accessibility-tested. Change only the header colour (text black or fuchsia, with white text) and the logo (brand skill).
- **Site map.** Areas and groups named for the work people do, not the table names.
- **Forms.** Sections with clear headings, fields in the order people work, required fields marked by the platform, and help text from column descriptions.
- **Views.** Names that say what's in them, such as "Open requests due this week". No views showing personal data to people who don't need it.
- **Business rules** for simple validation. Error messages follow the content-style skill.
- **Custom pages** follow the canvas-apps skill. Custom code components (PCF) need an accessibility check before use.
- Test forms with a keyboard and a screen reader (accessibility skill).

## The Dataverse MCP server

The app template connects the Dataverse MCP server to the dev environment set in `DATAVERSE_DEV_URL`. <!-- claude-only -->In the dev environment the assistant reads and changes tables, columns and records without asking, and the harness blocks deletes. <!-- /claude-only --><!-- copilot: The harness blocks deletes. VS Code may ask before other MCP tool calls: approve them only against the dev environment. --> Point it only at a dev environment that holds fictional data.
