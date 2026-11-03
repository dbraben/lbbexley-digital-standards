---
type: regex
target:
  source: file
  path: src/Postcode.pa.yaml
pattern: 'RGBA\s*\(|ColorValue\s*\(|Color\.(?!Transparent)[A-Z]'
match: not_contains
---
