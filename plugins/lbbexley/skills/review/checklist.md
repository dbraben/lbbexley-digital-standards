# Review checklist

- **[auto]** The standards check covers it.
- **[review]** Needs judgement: read the files.
- **[person]** Needs a person to test or sign off.

## Brand

- [auto] Colours only from Bexley tokens; no off-palette or legacy colours
- [auto] Lato only; no Google Fonts links
- [review] White text only on contrast colours, black text only on accent colours
- [review] Text is text black; text grey only on headings, rarely
- [review] Field and control borders are text black, not border grey
- [review] Links underlined, including on hover; focus style is yellow with the black border
- [review] Council logo with alt text "London Borough of Bexley"; no GOV.UK crown, logotype or GDS Transport

## Accessibility (WCAG 2.2 AA)

- [auto] Canvas: every input, icon and image has an AccessibleLabel
- [auto] HTML: every image has alt; html has lang; new-tab links say so
- [review] Labels and alt text make sense on their own ("Postcode", not "Text input 1"); decorative images are hidden
- [review] One H1 per screen or page; headings in order; canvas headings use Role
- [review] Logical reading and tab order; no positive TabIndex values
- [review] Visible focus on every interactive control
- [review] Targets at least 24 by 24px, ideally 44px high
- [review] Errors in text next to the field and in a summary, not colour alone; Live regions or announcements for messages
- [review] Layout reflows (containers, relative widths); nothing fixed that breaks at 400% zoom
- [review] No time limits without a way to extend; no auto-playing or flashing content
- [review] No information asked for twice in one journey; sign-in allows paste and password managers
- [person] Keyboard-only run through every journey
- [person] Screen reader run through every journey (Narrator or NVDA; VoiceOver or TalkBack on phones)
- [person] 200% and 400% zoom, and a phone-sized screen
- [person] App checker (canvas) or WAVE / Accessibility Insights (pages) shows no issues
- [person] Accessibility statement updated with the test date and any known issues

## Content style

- [auto] No lorem ipsum or other placeholder text; no emoji
- [review] Plain English, short sentences, active voice, reading age about 9 for public content
- [review] Buttons start with a verb and say what happens
- [review] Error messages follow the patterns: specific, no "please", "invalid" or blame
- [review] Sentence case; dates like "1 April 2027"; times like "9am"; no "click here"
- [review] No filler or marketing language ("seamless", "robust", "Welcome to…")

## Data protection

- [auto] No real-looking personal data (NI, NHS, card numbers, personal email addresses)
- [auto] No tracking scripts; no hard-coded tenant URLs or mailboxes in build files
- [review] Every field holding personal data is needed, and in the DPIA
- [review] Privacy notice linked where data is collected
- [review] Power Pages: no anonymous or global access to personal data; Web API fields listed, never `*`
- [review] Flows: Secure inputs and outputs on actions with personal data; no personal data in subjects or error alerts; one email per person
- [review] Records can be found, exported, corrected and deleted for a person; retention built in
- [person] DPIA screening agreed with Information Governance before real data is used

## Publicity

- [review] Clearly identified as from the London Borough of Bexley
- [review] Factual and even-handed; nothing designed to affect support for a political party
- [review] Councillor names, photos or quotes: appropriate, and none during a pre-election period
- [review] Third-party content moderated; external links reviewed
- [review] Public agents decline political questions and point to Electoral Services
- [person] Communications has seen anything with publicity value

## Equality

- [review] A non-digital route exists for public services, and is mentioned
- [review] Inclusive form design: names, titles, sex and gender only when needed, manual address entry
- [review] Equality monitoring questions optional, separate, with "Prefer not to say"
- [person] Equality impact assessment done for new or changed services

## AI transparency (where AI is used)

- [review] People are told they're using an automated assistant, and can reach a person
- [review] Knowledge limited to council-controlled sources; general knowledge and web search off
- [review] Sensitive topics handled by fixed topics with official contacts
- [review] A person makes significant decisions, or the Article 22C safeguards are in place
- [review] Test set covers sensitive, political and adversarial questions
- [person] ATRS record completed for public-facing tools

## Platform

- [auto] Solutions use the `lbbexley` publisher prefix, not the default publisher
- [auto] Canvas: no hard-coded colours outside App.Formulas
- [auto] Flows with 3 or more actions have error handling
- [review] Controls, variables, flows and actions named to the conventions
- [review] Canvas: delegation warnings fixed; OnStart minimal; IfError around writes
- [review] Environment variables and connection references, not hard-coded values
- [review] Model-driven: standard forms and theme; views and site map named for the work
- [review] Flows owned by the service, not one person
