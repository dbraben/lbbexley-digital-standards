# Accessibility testing

Automated tools catch the obvious problems quickly, but they can't judge whether a label or alt text makes sense. The legal responsibility stays with the council, so don't accept "it passed an automated test" from anyone, including a supplier or an AI assistant.

## 1. Automated checks (minutes)

- **Canvas apps**: App checker > Accessibility in Power Apps Studio.
- **Pages and web content** (Chrome extensions): WAVE, Accessibility Insights for Web, Siteimprove Accessibility Checker.
- **Contrast**: Colour Contrast Analyser, or the Kontrast extension.
- **Reading level**: Read-Able (paste text in to score it).
- **Documents**: Office's Check Accessibility; Adobe Reader's Quick check for PDFs.

## 2. Manual checks (an hour per journey)

**Keyboard only.** Put the mouse away and complete every journey:

| Key | Does |
|---|---|
| Tab / Shift + Tab | Next / previous link or field |
| Enter | Follow a link or press a button |
| Space | Tick a checkbox or press a button |
| Arrow keys | Move between radio buttons or options |
| Alt + Down arrow | Open a drop-down |
| Alt + D | Go to the browser address bar |
| Alt + Left arrow | Go back a page |

Check that focus is always visible, the order makes sense, and nothing traps focus.

**Screen reader.**
- Narrator is built into Windows: Windows logo key + Ctrl + Enter starts and stops it.
- NVDA is free and more realistic: raise a helpdesk call to have it installed for testing.
- On phones: VoiceOver (iOS: Settings > Accessibility > VoiceOver) and TalkBack (Android: Settings > Accessibility). With a screen reader on, select an item with one tap, then double-tap to activate it.

**Zoom and reflow.** 200% and 400% browser zoom, and a 320px-wide window: nothing cut off, no sideways scrolling.

**Magnifier and voice.** Windows Magnifier (up to 16x) stands in for ZoomText. Windows Speech Recognition gives a feel for voice control tools such as Dragon.

**Awareness tools.** The Funkify disability simulator and "I want to see like the colour blind" show the barriers people meet.

## 3. People (the gold standard)

Before launch, put the service in front of people who use assistive technology. The Digital Team can help recruit, and runs a staff user group of people with access needs.

## Record it

Note what was tested, how, when and by whom, and update `docs/compliance/accessibility-statement.md` (its "last tested" date and any known issues).
