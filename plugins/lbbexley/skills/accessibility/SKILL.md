---
name: accessibility
description: Bexley accessibility rules (WCAG 2.2 AA plus the council's own guides) for canvas apps, Power Pages, model-driven apps, Copilot Studio agents, emails and documents. Use when building or reviewing anything people see, hear or operate, including staff-only apps, and before publishing.
---

# Accessibility

## The law and why it applies to staff apps too

- The Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018 cover public websites and apps **and** intranets and extranets. Staff-facing Power Apps, SharePoint, B:HIVE content and browser-based systems are in scope.
- The standard is **WCAG 2.2 AA**, and every website and app needs an accessibility statement. (B:HIVE's guides still say WCAG 2.1; build to 2.2.)
- The Equality Act 2010 still requires reasonable adjustments, even for content the regulations exempt.
- The council stays legally responsible when a supplier builds or hosts the service.

## Every build

1. **Text alternatives.** Meaningful images have alt text that conveys the same meaning. Imagine reading the page to someone on the phone: what would you say about the image? No "image of…". Decorative images have empty alt text. Charts state the key message ("Bexley recycles 52% of waste, the highest rate in London") and link to the data as a table.
2. **Keyboard.** Everything works without a mouse, in a logical order, with a clearly visible focus.
3. **Structure.** One H1 per screen or page, headings in order, real lists, and data tables with header rows.
4. **Labels.** Every input has a visible label that makes sense on its own ("Postcode", not "Box 1"). Hints sit with their field. Required fields say so in words.
5. **Errors.** Say what went wrong and how to fix it, next to the field and in an error summary. Never rely on colour alone.
6. **Contrast.** 4.5:1 for body text, 3:1 for large text and for the boundaries of controls. No meaning carried by colour alone (WCAG 1.4.1).
7. **Reflow and zoom.** Usable at 400% zoom or 320px wide without scrolling sideways. Text resizes to 200%.
8. **Target size.** At least 24 by 24px (WCAG 2.2). Aim for 44px high on touch screens.
9. **Time and motion.** No time limit without a way to extend it. Nothing flashes. Animation can be paused.
10. **New in WCAG 2.2.** Focus isn't hidden behind sticky headers (2.4.11). Dragging has a single-click alternative (2.5.7). Help appears in the same place on every page (3.2.6). Don't ask for information already given in the same journey (3.3.7). No memory or puzzle tests to sign in: allow paste and password managers (3.3.8).
11. **Plain English.** See the content-style skill.
12. **Audio and video.** Captions and transcripts for recorded media. Live content is exempt only while it is live: a recording of a council meeting must be fully captioned once it's published.

## Platform detail

- Canvas apps: [canvas.md](canvas.md)
- Power Pages: [power-pages.md](power-pages.md)
- Emails, Word documents and PDFs: [documents-and-email.md](documents-and-email.md)
- Model-driven apps: keep Microsoft's standard forms and theme, give every column a clear display name and description, and test the forms with a keyboard and screen reader.
- Copilot Studio: short replies, real text rather than images, alt text on images in adaptive cards, and an easy way to reach a person.

## Testing: automated checks aren't enough

Tools can confirm a label exists, but not that it makes sense. A form labelled "Box 1, Box 2" passes an automated test and fails real people. Test in three layers: automated tools, then manual checks, then people with disabilities. See [testing.md](testing.md).

## Accessibility statement

Every website and app needs one. Link it from every page, usually in the footer, and review it at least once a year. It must say whether the service is fully, partially or not compliant, list what isn't accessible and why, explain how to get an alternative format, and say how to report a problem, including the enforcement procedure. In an app repository, keep it in `docs/compliance/accessibility-statement.md`.

## Exemptions and disproportionate burden

Live audio and video, most maps (if a map helps people find a service, give directions another way), some content published before the regulations, and third-party content the council neither paid for nor controls can be exempt. Claiming disproportionate burden needs a written assessment that weighs the benefit to disabled users against the cost. Lack of time, knowledge or priority doesn't count. Agree any claim with the Digital Team.

## Help

Ask the Digital Team. The B:HIVE bitesize accessibility guides, produced with Shaw Trust, cover each topic in more depth, and there's a digital accessibility course on Learning Pool.
