---
name: power-pages
description: Bexley build standards for Power Pages sites - page layout, brand CSS, forms, table permissions and Web API security, authentication, site settings, cookies, and safe deployment. Works alongside Microsoft's power-pages plugin. Use when creating, editing, reviewing or deploying a Power Pages site, template, web file or form.
---

# Power Pages

Microsoft's power-pages plugin (power-platform-skills marketplace) handles site creation and deployment mechanics. This skill sets the Bexley standards. Power Pages sites are usually public, so the accessibility, content-style, publicity and data-protection skills all apply in full.

## Every page

- Load the Bexley stylesheet: upload the brand skill's `tokens.css` as a web file, and self-host the Lato font files. No Google Fonts or other font links (standards check).
- Layout: "Skip to main content" link, header with the council logo and service name, `<main>`, footer with links to the accessibility statement, privacy notice, cookies page and contact details.
- `<html lang="en-GB">`, one `<h1>`, page titles in the form "Page name – Service name – London Borough of Bexley".
- No analytics, tracking or advertising scripts, and no embedded content that tracks visitors without consent (data-protection skill, `cookies.md`).
- Detailed accessibility rules: the accessibility skill's `power-pages.md`.

## Forms

- Follow the GOV.UK question-page pattern: one thing per page for anything longer than a few fields, a "Check your answers" page, and a confirmation page with a reference number.
- Labels, hints and errors as in the content-style skill. Error summary at the top, linked to each field.
- Avoid CAPTCHA. If spam is a real problem, talk to the Digital Team about other protection, because CAPTCHAs block many disabled people.
- Basic and multistep forms generate their own markup. Test each one with a keyboard and a screen reader, and adjust with Liquid templates or CSS where needed.

## Security and personal data

Power Pages exposes Dataverse to the internet, so mistakes leak data.

- **Table permissions.** Least privilege, scoped to the signed-in contact or account wherever possible. Never grant global read to anonymous users on a table that holds personal data.
- **Web roles.** Anonymous users get only what public pages need. Check what each role can do.
- **Web API.** Enable it only for tables that need it, and list the exact fields in the `Webapi/<table>/fields` site setting. Never use `*`.
- **Lists and search.** Check that lists, search results and lookups only show records the user may see.
- **Authentication.** Staff sign in with Microsoft Entra ID. The identity provider for residents is a Digital Team decision, so don't add a new one in a build.
- **Headers.** Keep the Content Security Policy and other HTTP header site settings that the Digital Team provides. Don't loosen them to make a script work.
- **Dev and test sites** are private, so they don't appear in search engines and aren't found by the public.

## Deployment

- Build and test against the dev site only. Uploads ask for confirmation, and deploying to test and production goes through the pipeline with approval, never from a laptop.
- Keep site source in the repository (`src/`), and review every change in a pull request.

## Before you call it done

Add each page to `tests/accessibility/targets.json` and run `npm run test:a11y`: it runs axe against WCAG 2.2 AA and checks reflow at 320 pixels and focus visibility on every tab stop. Then run WAVE or Accessibility Insights on every page template, test keyboard and screen reader journeys, check table permissions as an anonymous user and as a test user, then run `/lbbexley:review`.
