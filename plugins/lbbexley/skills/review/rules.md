# What the standards check checks

Generated from the standards check (`scripts/lib/checks.js`). Severity sets the order to fix things in, not whether to fix them: the definition of done is zero findings of any severity.

To suppress a finding that genuinely doesn't apply, put `lbbexley-ignore: <rule> <reason>` on the line or the line above. A suppression without a reason is itself a finding. Personal-data findings can only be suppressed line by line.

| Rule | Severity | WCAG 2.2 | Finds |
|---|---|---|---|
| `personal-data` | error |  | Real-looking NI, NHS or card numbers, or personal email addresses |
| `placeholder-text` | error |  | Lorem ipsum or other placeholder text |
| `emoji` | error |  | Emoji in user-facing text |
| `tenant-url` | warning |  | Environment-specific URLs instead of environment variables |
| `tracking-script` | warning |  | Analytics or tracking scripts that need consent |
| `google-fonts` | warning |  | Fonts loaded from Google instead of self-hosted Lato |
| `legacy-colour` | warning |  | Legacy Bexley colours (Royal, Hyacinth, Geranium) |
| `canvas-hardcoded-colour` | error |  | Canvas colour literals outside App.Formulas |
| `canvas-off-palette` | error |  | Canvas colours not in the Bexley palette |
| `canvas-missing-label` | error | 1.1.1, 4.1.2 | Canvas inputs, icons and images without AccessibleLabel |
| `canvas-font` | warning |  | Canvas fonts other than Lato |
| `canvas-tabindex` | error | 2.4.3 | Positive TabIndex values that break the focus order |
| `canvas-focus-hidden` | error | 2.4.7 | FocusedBorderThickness of 0, which hides keyboard focus |
| `canvas-target-size` | error | 2.5.8 | Interactive controls smaller than 24 by 24 |
| `canvas-contrast` | error | 1.4.3 | Text and background token pairs below the contrast minimum |
| `canvas-heading` | warning | 1.3.1, 2.4.6 | Screens without exactly one Heading1 |
| `canvas-text-size` | warning |  | Text smaller than Bexley small print (13pt) |
| `canvas-disabled-button` | warning |  | Buttons disabled until a form is complete |
| `html-img-alt` | error | 1.1.1 | Images without an alt attribute (pages and email templates) |
| `html-alt-text` | warning | 1.1.1 | Alt text that starts "image of" or "picture of" |
| `html-new-tab` | warning | 3.2.5 | Links that open a new tab without saying so |
| `html-lang` | error | 3.1.1 | Pages without a lang attribute |
| `html-title` | error | 2.4.2 | Pages without a title |
| `html-input-label` | error | 1.3.1, 3.3.2, 4.1.2 | Form fields without a label |
| `html-empty-link` | error | 2.4.4, 4.1.2 | Links and buttons with no accessible name |
| `html-tabindex` | error | 2.4.3 | Positive tabindex values |
| `html-autoplay` | error | 1.4.2 | Audio or video that plays automatically |
| `html-zoom-disabled` | error | 1.4.4 | Viewport settings that stop people zooming |
| `html-heading-order` | warning | 1.3.1 | Skipped heading levels, or more than one h1 on a page |
| `css-font` | warning |  | CSS fonts other than Lato |
| `css-pure-black` | warning |  | Pure black instead of Bexley text black |
| `css-off-palette` | warning |  | CSS colours not in the Bexley palette |
| `css-contrast` | error | 1.4.3 | CSS text and background pairs below 4.5:1 |
| `css-focus-hidden` | error | 2.4.7 | Focus styles that remove the outline with no replacement |
| `card-image-alt` | error | 1.1.1 | Adaptive card images without altText |
| `flow-error-handling` | warning |  | Flows with no Catch scope for failures |
| `flow-hardcoded-mailbox` | warning |  | Hard-coded @bexley.gov.uk mailboxes in flows |
| `solution-prefix` | error |  | Solutions with a publisher prefix other than lbbexley |
| `solution-default-publisher` | error |  | Solutions that use the default publisher |
| `ignore-needs-reason` | error |  | Suppressions without a written reason |
| `compliance-incomplete` | error |  | Template placeholders left in compliance documents (release check) |
