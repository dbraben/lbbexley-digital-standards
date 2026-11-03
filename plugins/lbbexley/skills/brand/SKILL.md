---
name: brand
description: London Borough of Bexley digital brand (colours, Lato typography, links, focus and error styles, identity) for canvas apps, Power Pages, model-driven apps, emails and agent cards. Use whenever you choose a colour, font, size or style, or build anything people will see.
---

# Bexley digital brand

Source: B:HIVE "Digital design guidelines – colour and typography" (Digital Team). If this skill and the guide disagree, the guide wins: tell the Digital Team so the skill can be corrected.

## The look

- White backgrounds and text black (#0B0C0C) are the core of every interface: websites, apps and portals.
- One typeface: **Lato**.
- Colour builds a clear hierarchy. It never carries meaning on its own.

## Colours

Always use the named tokens: [tokens-canvas.md](tokens-canvas.md) for canvas apps, [tokens.css](tokens.css) for Power Pages and HTML. Never type raw colour values into screens or pages.

| Group | Token | Hex | Text on it |
|---|---|---|---|
| Primary contrast | BexleyFuchsia | #912B88 | White only |
| | BexleyAquaDark | #06828D | White only |
| | BexleySpring | #218721 | White only |
| | BexleyGrape | #6056B3 | White only |
| | BexleyTango | #DC3800 | White only |
| Primary accent | BexleyFuchsiaLight | #FED7FC | Black only |
| | BexleyAquaLight | #A2F6F6 | Black only |
| | BexleySpringLight | #D2F88C | Black only |
| | BexleyGrapeLight | #D8DAFD | Black only |
| | BexleyTangoLight | #FDBE86 | Black only |
| Text | BexleyTextBlack | #0B0C0C | – |
| | BexleyTextGrey | #6F777B | Headings H1–H4 only, rarely |
| Panels | BexleyHighlight | #F3F2F1 | Black |
| | BexleyPanel | #DEE0E2 | Black |
| | BexleyBorder | #BFC1C3 | Decorative borders only |
| Links | BexleyLink | #005EA5 | – |
| | BexleyLinkHover | #2B8CC4 | Large text only (3.7:1 on white) |
| | BexleyLinkVisited | #4C2C92 | – |
| States | BexleyFocus | #FFDD00 | Black |
| | BexleyError | #D4351C | Error messages only |
| | BexleyMark | #FFF199 | Black; highlighting only |

Rules:

- White text only on the five contrast colours (typically promotion areas). Black text only on the five accent colours.
- Fuchsia is Bexley's signature colour and ties to the logotype. Use it as an accent, never as the dominant base of a theme.
- Don't use palette colours for text. All text is text black; text grey only for H1–H4, and rarely.
- Aqua Dk, Spring and Tango pass AA with white text by a narrow margin (4.56 to 4.61:1). Never lighten them, make them transparent or put them over images.
- The border grey is 1.8:1 against white, so it's for decoration only. Form fields and other controls need a 3:1 boundary: use text black.
- Error red is for error messages only. Mark yellow (#FFF199) highlights body text, such as search keywords, never errors.
- No text in images. Text over colour or images must reach 4.5:1 (body, 19px / 14pt) or 3:1 (large, 24px / 18pt and above).
- Legacy colours (Royal #2E358B, Hyacinth #286FD4, Geranium #E6005B) are reference only. Don't use them in new work.

Measured contrast for every pairing, and the three issues to know about: [colour-contrast.md](colour-contrast.md).

## Typography

| Style | Size / line height (px) | Weight | Canvas size (pt) |
|---|---|---|---|
| H1 | 48 / 56 | 900 | 36 |
| H2 | 38 / 50 | 900 | 28 |
| H3 | 28 / 40 | 900 | 21 |
| H4 | 24 / 36 | 900 | 18 |
| H5 | 19 / 28 | 900 | 14 |
| Lead paragraph | 24 / 32 | 400 | 18 |
| Paragraph | 19 / 28 | 400 | 14 |
| Small print / caveat | 17 / 24 | 400 | 13 |

- Blockquote: 19 / 26, weight 400, with an opening quote mark in #BFC1C3 at 120px, weight 700.
- Callout: 19 / 26, weight 400, with an 8px left border in #BFC1C3.
- Canvas apps size text in points (px × 0.75). Use FontWeight.Bold for headings.

## Links and focus

- Links are #005EA5 and always underlined. Visited links are #4C2C92.
- Focus: yellow #FFDD00 background with a black bottom border. The yellow alone is 1.35:1 against white, so the black border is what makes focus visible. Never drop it.
- Navigation links styled as buttons don't need an underline but must keep visible hover and focus states.
- Hover #2B8CC4 is only 3.7:1 on white and 3.3:1 on the light greys, below the 4.5:1 that normal-size text needs. Use it only on large text. Normal-size links keep #005EA5 on hover, with a thicker underline in CSS, so the hover state passes too.

## Identity

- Every app, page and email clearly shows it comes from the London Borough of Bexley (Publicity Code para 30). Use the approved logotype from Communications in the header (see [assets/README.md](assets/README.md)). Don't redraw, recolour or stretch it, or put it on a busy background.
- GOV.UK patterns are welcome; GOV.UK identity isn't. No crown, no GOV.UK logotype and no GDS Transport font.

## By platform

- **Canvas apps**: paste the App.Formulas block from [tokens-canvas.md](tokens-canvas.md) before building, then use tokens only. The standards check rejects colour literals elsewhere.
- **Power Pages**: upload [tokens.css](tokens.css) as a web file and self-host Lato. Don't link Google Fonts.
- **Model-driven apps**: keep Microsoft's standard, accessibility-tested theme. Change only the header colour (text black or fuchsia, with white text) and the logo.
- **Copilot Studio**: adaptive cards use text black on white. Use an accent colour only with the right text colour from the table above.
- **Emails from flows**: text black on white, Lato then Arial, logo with alt text "London Borough of Bexley". See the accessibility skill (documents-and-email.md).
