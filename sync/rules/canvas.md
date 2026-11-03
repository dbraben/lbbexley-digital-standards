---
description: Bexley rules for canvas app source (pa.yaml)
paths:
  - "**/*.pa.yaml"
---

# Canvas app source

Use the canvas-apps, brand and accessibility skills. These rules always apply:

- Colours, fonts and sizes from the Bexley tokens only (`BexleyFuchsia`, `BexleyFont`, `BexleySizeBody`). No RGBA(), ColorValue() or Color.X outside App.Formulas.
- Every input, icon and image has an AccessibleLabel that makes sense on its own. Decorative ones: `AccessibleLabel: =""` and `TabIndex: =-1`.
- One `Role: =TextRole.Heading1` per screen, then Heading2 to Heading4 in order.
- Interactive controls: `TabIndex: =0`, `FocusedBorderColor: =BexleyTextBlack`, `FocusedBorderThickness: =BexleyFocusThickness`, at least 24 by 24 (height `BexleyTargetHeight`).
- White text only on the five contrast colours; black text only on the accent colours.
- Build layouts from containers so screens reflow. Rename every control (`btnSubmit`, `txtPostcode`).
- New screens go into `tests/accessibility/targets.json` in the same change.
