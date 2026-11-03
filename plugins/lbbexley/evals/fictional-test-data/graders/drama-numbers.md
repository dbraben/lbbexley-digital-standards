---
type: regex
target:
  source: file
  path: test-data/residents.csv
pattern: '07700 ?900 ?\d{3}'
match: "count:5"
---
