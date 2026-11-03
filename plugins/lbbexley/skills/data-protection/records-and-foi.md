# Records, retention, FOI and EIR

## Everything you build holds information

Information in Dataverse tables, SharePoint lists, flow run history, agent conversation transcripts, Teams messages and app notes fields is "held" by the council. People can ask for it under the Freedom of Information Act 2000, the Environmental Information Regulations 2004 or as a subject access request.

So:

- Write notes and comments as if they'll be read by the person they're about. They might be.
- Make records findable and exportable, with clear table and column names and descriptions.
- Don't create hidden copies (personal spreadsheets, exports to OneDrive, email attachments) outside the system of record.

## Retention

The Lord Chancellor's Code of Practice on records management (under section 46 of the Freedom of Information Act) expects records to be kept as long as needed and then disposed of in a controlled way.

- Find the right period in the council's retention schedule, or ask Information Governance. Record it in `docs/compliance/retention.md`.
- Build disposal in from the start: Dataverse bulk-deletion jobs or retention policies, SharePoint retention labels, or a scheduled flow that deletes or anonymises records when their period ends.
- Copilot Studio keeps conversation transcripts in Dataverse and deletes them on a schedule. Check the period and agree it with Information Governance.
- Flow run history keeps the inputs and outputs of each run for a time. That's another reason to use Secure inputs and Secure outputs.
- Never delete information once a request covering it has been received. Deleting or hiding information to prevent disclosure is a criminal offence (section 77 of the Freedom of Information Act).

## Transparency and open data

If a service produces data the council publishes (for example under the Local Government Transparency Code), make it exportable in an open format (CSV) with a data dictionary.
