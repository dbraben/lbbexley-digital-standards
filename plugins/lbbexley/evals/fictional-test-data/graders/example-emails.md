---
type: regex
target:
  source: file
  path: test-data/residents.csv
pattern: '@example\.(com|org|net)'
match: "count:5"
---
