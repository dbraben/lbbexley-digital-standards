---
type: regex
target:
  source: file
  path: test-data/residents.csv
pattern: 'QQ ?\d{2} ?\d{2} ?\d{2} ?[A-D]'
match: "count:5"
---
