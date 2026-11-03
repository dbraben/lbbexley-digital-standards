# Accessibility in Power Pages

## Page basics

- `<html lang="en-GB">`.
- Page titles follow "Page name – Service name – London Borough of Bexley". On an error, start the title with "Error: ".
- A "Skip to main content" link is the first thing that takes focus.
- Landmarks: `<header>`, `<nav>`, `<main>` and `<footer>`, each used once except nav.
- One `<h1>` per page, with headings in order.
- Load `tokens.css` from the brand skill for colours, focus styles and typography.

## Forms

- Prefer one question per page for anything longer than a few fields.
- Every field has a `<label>`. Hints are linked with `aria-describedby`. Radios and checkboxes sit in a `<fieldset>` with a `<legend>`.
- Never use placeholder text as the label.
- On error, show an error summary at the top with links to each field, and an inline message above each field that starts with a visually hidden "Error:".
- Use the right `autocomplete` values (name, email, tel, postal-code, address-line1) so browsers and assistive tools can fill them.
- Don't disable buttons. Show a confirmation page with a reference number and what happens next.
- Microsoft's basic and multistep forms produce their own markup: check every form with the tools below, and adjust with Liquid or CSS where needed.

## Content

- Link text says where the link goes. Links that open a new tab say "(opens in new tab)". The standards check flags those that don't.
- Images have alt text that says what they mean; decorative images use `alt=""`.
- Data tables use `<th>` with `scope`. Don't use tables for layout.
- No carousels or auto-playing media.
- Publish as HTML. Documents are extras, never the only version (see documents-and-email.md).

## Footer

Every page links to the accessibility statement, privacy notice and cookies page, plus a way to contact the service.

## Testing

WAVE or Accessibility Insights on every page template, then keyboard only, NVDA, 400% zoom and a phone. See testing.md.
