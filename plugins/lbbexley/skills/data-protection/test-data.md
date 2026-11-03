# Fictional test data

Use made-up data everywhere outside production: dev and test environments, prompts, sample files, screenshots, demos and pull requests. Use formats that can never belong to a real person. The standards check ignores every format below.

| Data | Use | Example |
|---|---|---|
| Name | Obviously invented names | Alex Testperson, Sam Example |
| Email | example.com, example.org or example.net (reserved for examples) | alex.testperson@example.com |
| Mobile number | Ofcom's drama range 07700 900000 to 07700 900999 | 07700 900123 |
| London number | 020 7946 0000 to 020 7946 0999 | 020 7946 0321 |
| Other landline | 01632 960000 to 01632 960999 | 01632 960 001 |
| National Insurance number | QQ prefix, which is never issued | QQ 12 34 56 C |
| NHS number | 999 range, reserved for testing (passes the check digit) | 999 000 0018 |
| Payment card | The payment provider's sandbox test cards only | 4000 0566 5566 5556 |
| Address | An invented street with the council's own postcode | 10 Example Road, Bexleyheath DA6 7AT |
| Date of birth | Any invented date | 14 February 1985 |
| Council reference | A prefix that marks it as a test | TEST-000123 |

## Rules

- Never "anonymise" real records yourself by changing a few fields. Real data with names removed can still identify people.
- Don't use real staff names or email addresses in test data. Use shared test accounts set up for testing.
- Don't use the names of councillors or other public figures.
- Generate bulk data with a script that uses these formats, and keep the script in `test-data/`.
- Keep test data files small and in `test-data/`, so reviewers can see what's there.

## Sample CSV

```csv
reference,first_name,last_name,email,phone,postcode
TEST-000001,Alex,Testperson,alex.testperson@example.com,07700 900001,DA6 7AT
TEST-000002,Sam,Example,sam.example@example.org,020 7946 0002,DA6 7AT
TEST-000003,Jo,Sample,jo.sample@example.net,01632 960003,DA6 7AT
```

<!-- claude-only -->
## In a prompt

If you need to paste made-up values that look real, add `[fictional]` to the message so the personal-data guard lets it through. Never use that tag for real data.
<!-- /claude-only -->
