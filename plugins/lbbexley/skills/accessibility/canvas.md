# Accessibility in canvas apps

## Names and labels

- **AccessibleLabel** on every input (text input, drop-down, combo box, date picker, toggle, radio, slider, rating, list box), icon and image. The standards check enforces this.
- The label makes sense on its own: "Postcode", not "Text input 3".
- Decorative images and icons: `AccessibleLabel: =""` and `TabIndex: =-1`, so screen readers skip them.
- Icons that do something are named by their action: "Delete request", not "Bin icon".
- Buttons are named by their Text. Make it specific: "Submit request", not "OK".
- Screens are announced by screen readers, so give them plain names ending in "Screen", for example "Request details Screen".

## Structure and reading order

- Set **Role** on heading labels: `TextRole.Heading1` once per screen, then Heading2 to Heading4 in order.
- Build with vertical and horizontal containers so the reading order matches the visual order.
- `TabIndex: =0` for anything interactive and `=-1` for everything else. Never use positive TabIndex values.
- Galleries: give the gallery an AccessibleLabel, and make sure the selected item is shown by more than colour (a border or a tick plus text).

## Focus, contrast and size

- `FocusedBorderColor: =BexleyTextBlack`, `FocusedBorderThickness: =BexleyFocusThickness` (3) on every interactive control.
- Colours from the Bexley tokens only. Field borders use text black, never the border grey.
- Interactive controls at least 44px high. Leave space between them.

## Errors and status

- Validate when the user submits, not on every keystroke.
- Show the error in text next to the field, in error red and bold, with the field name: "Enter your postcode".
- Use a label with `Live: =Live.Polite` for messages a screen reader should announce.
- Notify() is fine for brief confirmations, but put anything the user must act on, on the screen.
- Don't disable the submit button to show a form is incomplete. Let people submit and tell them what to fix.

## Responsive layout

- Use containers and Parent.Width or App.Width, not fixed X and Y positions.
- Check the app on a phone-sized screen and at 200% browser zoom.

## Before review

- Run **App checker > Accessibility** in Power Apps Studio and fix everything it reports.
- Tab through every screen with the keyboard only.
- Go through each journey with Narrator (Windows logo key + Ctrl + Enter starts and stops it) or NVDA.
