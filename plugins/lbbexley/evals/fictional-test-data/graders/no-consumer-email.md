---
type: regex
target:
  source: file
  path: test-data/residents.csv
pattern: '@(gmail|googlemail|hotmail|outlook|live|yahoo|icloud|btinternet)\.'
flags: i
match: not_contains
---
