# Bexley tokens for canvas apps

Paste this into **App > Formulas** before building any screen. In source it sits under App > Properties > Formulas in `App.pa.yaml`. Then use the token names for every colour, font and size. The standards check rejects RGBA(), ColorValue() and Color.X anywhere else.

```
// Bexley digital design tokens. Source: B:HIVE colour and typography guidelines.
// Primary contrast colours: white text only
BexleyFuchsia = ColorValue("#912B88");
BexleyAquaDark = ColorValue("#06828D");
BexleySpring = ColorValue("#218721");
BexleyGrape = ColorValue("#6056B3");
BexleyTango = ColorValue("#DC3800");
// Primary accent colours: black text only
BexleyFuchsiaLight = ColorValue("#FED7FC");
BexleyAquaLight = ColorValue("#A2F6F6");
BexleySpringLight = ColorValue("#D2F88C");
BexleyGrapeLight = ColorValue("#D8DAFD");
BexleyTangoLight = ColorValue("#FDBE86");
// Text and background
BexleyTextBlack = ColorValue("#0B0C0C");
BexleyTextGrey = ColorValue("#6F777B");
BexleyWhite = ColorValue("#FFFFFF");
// Panels for secondary information
BexleyHighlight = ColorValue("#F3F2F1");
BexleyPanel = ColorValue("#DEE0E2");
BexleyBorder = ColorValue("#BFC1C3");
// Links, focus, errors and highlighting
BexleyLink = ColorValue("#005EA5");
BexleyLinkHover = ColorValue("#2B8CC4");
BexleyLinkVisited = ColorValue("#4C2C92");
BexleyFocus = ColorValue("#FFDD00");
BexleyError = ColorValue("#D4351C");
BexleyMark = ColorValue("#FFF199");
// Typography. Canvas sizes are points (px x 0.75).
BexleyFont = Font.Lato;
BexleySizeH1 = 36;
BexleySizeH2 = 28;
BexleySizeH3 = 21;
BexleySizeH4 = 18;
BexleySizeH5 = 14;
BexleySizeLead = 18;
BexleySizeBody = 14;
BexleySizeSmall = 13;
// Focus and touch targets
BexleyFocusThickness = 3;
BexleyTargetHeight = 44;
```

## Using the tokens

| Control | Properties |
|---|---|
| Body text label | Color: BexleyTextBlack · Font: BexleyFont · Size: BexleySizeBody |
| Page heading | Size: BexleySizeH1 · FontWeight: FontWeight.Bold · Role: TextRole.Heading1 |
| Primary button | Fill: BexleyFuchsia · Color: BexleyWhite · HoverFill: ColorFade(BexleyFuchsia, -20%) · PressedFill: ColorFade(BexleyFuchsia, -30%) · FocusedBorderColor: BexleyTextBlack · FocusedBorderThickness: BexleyFocusThickness · Height: at least BexleyTargetHeight |
| Secondary button | Fill: BexleyPanel · Color: BexleyTextBlack · BorderColor: BexleyTextBlack · BorderThickness: 2 |
| Text input, drop-down, date picker | BorderColor: BexleyTextBlack · BorderThickness: 2 · FocusedBorderColor: BexleyTextBlack · FocusedBorderThickness: BexleyFocusThickness |
| Error message | Color: BexleyError · FontWeight: FontWeight.Bold · Live: Live.Polite |
| Link-style label | Color: BexleyLink · Underline: true · HoverColor: BexleyLink (BexleyLinkHover is for large text only) · FocusedBorderColor: BexleyTextBlack · TabIndex: 0 |
| Panel or inset | Fill: BexleyHighlight or BexleyPanel |
| Promotion banner | Fill: one contrast colour · text Color: BexleyWhite |

The primary button colour (fuchsia, 7.2:1 with white text) is the harness default. The guide doesn't set button colours, so confirm the choice with the Digital Team.

Classic controls expose all of these properties. Modern controls take their colours from the app theme: if you use them, build a theme from these values instead of setting colours control by control.
