---
type: llm
---

PASS if the reply gives two short error messages where the first tells the person what to do about the empty date (for example "Enter the start date") and the second says the date must be in the future (for example "Start date must be in the future"), and neither message uses "please", "sorry", "invalid", "error", "oops", an exclamation mark or blaming words such as "you forgot".
FAIL if either message is vague, technical, apologetic, blames the user, uses any of those words or an exclamation mark, or there aren't two messages.
