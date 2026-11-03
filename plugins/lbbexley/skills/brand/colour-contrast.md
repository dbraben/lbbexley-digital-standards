# Measured contrast for the Bexley palette

WCAG 2.2 contrast ratios, calculated from the hex values in the brand guide. AA needs 4.5:1 for body text, and 3:1 for large text (24px / 18pt and above, or 19px bold) and for the boundaries of controls.

| Pairing | Ratio | Result |
|---|---|---|
| Fuchsia #912B88 with white text | 7.23:1 | AAA |
| Grape #6056B3 with white text | 6.04:1 | AA |
| Spring #218721 with white text | 4.61:1 | AA, narrowly |
| Aqua Dk #06828D with white text | 4.58:1 | AA, narrowly |
| Tango #DC3800 with white text | 4.56:1 | AA, narrowly |
| Spring Lt #D2F88C with black text | 16.37:1 | AAA |
| Aqua Lt #A2F6F6 with black text | 15.90:1 | AAA |
| Fuchsia Lt #FED7FC with black text | 15.24:1 | AAA |
| Grape Lt #D8DAFD with black text | 14.33:1 | AAA |
| Tango Lt #FDBE86 with black text | 12.02:1 | AAA |
| Text black on white | 19.59:1 | AAA |
| Text grey #6F777B on white | 4.56:1 | AA |
| Text grey on panel #DEE0E2 | 3.45:1 | Large text only |
| Link #005EA5 on white | 6.68:1 | AA |
| Link on panel #DEE0E2 | 5.05:1 | AA |
| Link on focus yellow #FFDD00 | 4.96:1 | AA |
| Visited #4C2C92 on white | 10.08:1 | AAA |
| Error #D4351C on white | 4.86:1 | AA |
| Black on focus yellow | 14.55:1 | AAA |
| Black on mark #FFF199 | 17.06:1 | AAA |
| Black on highlight #F3F2F1 | 17.52:1 | AAA |
| Black on panel #DEE0E2 | 14.80:1 | AAA |

## Three things to know

1. **Hover colour.** #2B8CC4 is 3.72:1 on white and 3.32:1 on highlight grey, below the 4.5:1 that normal-size text needs, in every state including hover. Use it only on large text. Normal-size links keep #005EA5 (6.68:1 on white) on hover, with a thicker underline in CSS. The standards check flags the hover colour on normal-size text, including on a transparent background in front of a coloured container. The Digital Team may want a darker hover colour in the next version of the guide.
2. **Border grey.** #BFC1C3 is 1.81:1 against white. That's fine for decorative borders such as panels and callouts, but the boundaries of form fields and other controls need 3:1 (WCAG 1.4.11). Use text black for those.
3. **Focus yellow.** #FFDD00 is 1.35:1 against white, so a yellow background alone isn't a visible focus indicator. The guide's black bottom border is what makes focus visible. Never remove it.

Also note: the guide's typography list shows the text colour as "#0B0COC" in several places. That's a typo for #0B0C0C, which is what the tokens use.
