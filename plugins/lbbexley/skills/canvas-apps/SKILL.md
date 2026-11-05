---
name: canvas-apps
description: Bexley build standards for Power Apps canvas apps in pa.yaml source - tokens, screen layout, naming, accessibility properties, delegation, error handling, performance and solutions. Works alongside Microsoft's canvas-apps plugin. Use when generating, editing or reviewing a canvas app or custom page.
---

# Canvas apps

Microsoft's canvas-apps plugin (power-platform-skills marketplace) does the authoring: it changes the app in the dev environment through the Canvas Authoring MCP server and the open Power Apps Studio tab, connected with `/configure-canvas-mcp`. This skill sets the Bexley standards those apps must meet, and says where the source lives. Apply the brand, accessibility and content-style skills too.

## Before the first screen

1. **Solution.** Build inside a solution in the dev environment whose publisher uses the `lbbexley` prefix. Never build in the Default solution.
2. **Tokens.** Paste the App.Formulas block from the brand skill (`tokens-canvas.md`) into App > Formulas.
3. **Layout pattern.** Start every screen from [screen-pattern.pa.yaml](screen-pattern.pa.yaml): a header with the council logo and service name, a scrolling main area, and a footer with the accessibility statement. All built from auto-layout containers so the app reflows.
4. **App settings.** Set App.StartScreen rather than navigating in OnStart. Turn on the App checker's accessibility rules.

## Naming

| Thing | Convention | Example |
|---|---|---|
| Screens | Plain words ending in "Screen" (screen readers announce them) | Request details Screen |
| Controls | Type prefix + PascalCase | `btnSubmit`, `txtPostcode`, `lblPostcodeError`, `galRequests`, `conHeader`, `icoDelete`, `imgLogo` |
| Global variables (Set) | `gbl` prefix | `gblCurrentUser` |
| Context variables (UpdateContext) | `loc` prefix | `locShowErrors` |
| Collections | `col` prefix | `colBasket` |
| Named formulas | PascalCase, no prefix; `Bexley` prefix only for design tokens | `OpenRequests`, `BexleyFuchsia` |
| Environment variables | publisher prefix | `lbbexley_ServiceMailbox` |

Rename every control the moment you add it. "Button3" and "TextInput1" fail review.

## Formulas

- Prefer named formulas (App.Formulas) for values that are derived from data, over global variables set in OnStart.
- Keep OnStart minimal. Load only what the first screen needs, and use `Concurrent()` for independent loads.
- **Delegation.** Keep queries delegable to Dataverse. Fix every delegation warning. Don't raise the data row limit to hide one, because the app will silently miss records.
- Don't copy whole tables into collections. Filter at the source and choose only the columns you need.
- **Errors.** Wrap writes in `IfError()` and show a plain-English message (content-style skill). Set `App.OnError` to show a friendly message and record what failed without personal data.
- No hard-coded URLs, mailboxes or IDs. Use environment variables. The standards check flags tenant URLs in source.
- Add comments (`//`) only where a formula's purpose isn't obvious.

## Accessibility and brand (enforced)

- Colours, fonts and sizes come from the Bexley tokens only. The standards check rejects RGBA(), ColorValue() and Color.X outside App.Formulas.
- Every input, icon and image has an `AccessibleLabel`. Decorative ones get `AccessibleLabel: =""` and `TabIndex: =-1`. The standards check rejects missing labels.
- Headings use `Role: =TextRole.Heading1` (one per screen) to `Heading4`, in order.
- Interactive controls: `FocusedBorderColor: =BexleyTextBlack`, `FocusedBorderThickness: =BexleyFocusThickness`, height at least `BexleyTargetHeight`.
- Full details: the accessibility skill's `canvas.md`.

## Testable by design

The accessibility tests and any functional tests find controls the way assistive technology does: by role and accessible name. A clear AccessibleLabel and button text make a control both accessible and testable, so you rarely need anything else to target it.

When you add a screen, add it to `tests/accessibility/targets.json` in the same change, with the player URL and a `waitFor` text that appears when the screen has loaded.

## Modern controls

Modern (Fluent) controls take colours from the app theme. If you use them, build a theme from the Bexley tokens instead of styling controls one by one, and still check focus visibility and contrast.

## Build in the app, keep the source in the repository

1. **The app exists first.** A person creates it in the solution in the dev environment (blank is fine), saves it, turns on coauthoring (**Settings**, **Updates**, **Coauthoring**) and keeps it open in Power Apps Studio. Microsoft's tools can't create the app or turn on coauthoring. Then connect with `/configure-canvas-mcp` and the Studio address.
2. **One folder per app: `src/canvas/<AppName>/`.** Give Microsoft's canvas tools that folder, by its full path, as their working folder. Sync the app into it before changing anything, change the `.pa.yaml` files there, then compile them into the app. Never leave a change in the files that isn't compiled into the app: the app and the repository must match.
3. **Microsoft's planning notes** (`.md` files the canvas tools write in that folder) are ignored by Git and the standards check. If the tools won't sync because notes from an earlier session are still there, clear them with `git clean -fX src/canvas/<AppName>/`.
4. **After compiling**, the end-of-run check has the solution synced into `src/solution`, then reviews, commits and pushes the source. The person saves and publishes the app in Studio when it's ready for others to use.
5. **Before you call it done:** run App checker > Accessibility in Power Apps Studio, then `/lbbexley:review`. The standards check also catches positive TabIndex values, hidden focus, targets under 24 by 24, token pairs below the contrast minimum and screens without exactly one Heading1.
