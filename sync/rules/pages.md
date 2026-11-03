---
description: Bexley rules for Power Pages templates, styles and scripts
paths:
  - "src/pages/**/*.{html,htm,liquid,css,js}"
---

# Power Pages source

Use the power-pages, brand, accessibility and content-style skills. These rules always apply:

- `lang="en-GB"`, a skip link, one `<h1>`, headings in order, and a title like "Page name – Service name – London Borough of Bexley".
- Every field has a `<label>`; hints use `aria-describedby`; groups use `<fieldset>` and `<legend>`. No placeholder text as labels.
- Every image has alt text (`alt=""` if decorative). Links say where they go; new-tab links say so.
- Colours from `tokens.css` variables only, Lato only (self-hosted), and the Bexley focus style. Never remove the focus outline without a replacement.
- No tracking, analytics or advertising scripts and no Google Fonts. No positive tabindex, no autoplay, and never stop people zooming.
- Table permissions: least privilege; never anonymous or global access to personal data.
- New pages go into `tests/accessibility/targets.json` in the same change.
