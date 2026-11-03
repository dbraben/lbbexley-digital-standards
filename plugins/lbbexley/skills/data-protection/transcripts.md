# Meeting recordings and transcripts

A recorded Teams meeting with the people who run a service is one of the best sources of requirements. It's also full of personal data: everyone's name, their opinions, and often details about residents. Handle it like any other record about people.

## Before the meeting

- Tell everyone why you want to record and transcribe it, who will see the transcript, and when it will be deleted. Teams shows everyone a notice when transcription starts, but say it out loud too. Anyone can ask you not to record.
- Ask people to talk about how the service works, not about particular residents. If an example helps, ask them to make one up.
- Follow the council's policy on recording meetings. Information Governance can tell you what applies.

## After the meeting

1. **Download the transcript** from the meeting's **Recap** tab, as a `.vtt` file if you can. Save it outside your repository, for example in your Downloads folder. Only the organiser and co-organisers can download it.
2. **Clean it** with `npm run transcript:clean -- <path to the transcript>`, run by you, not the assistant. It writes a cleaned copy to `docs/discovery/` in your repository, which is never committed. Each speaker gets a role instead of a name, and email addresses, phone numbers, full postcodes and reference numbers are removed.
3. **Name the speakers by role.** The tool writes a roles file next to the original transcript. Change "Speaker 1" and so on to roles such as "Service manager", and run the tool again. The roles file holds names, so it stays next to the original, never in a repository.
4. **Read the cleaned copy from start to finish** and fix what no tool can find (checklist below).
5. **Delete the original and the roles file** when you've agreed the requirements, unless the council's retention schedule says to keep them. The recording itself stays where Teams saved it, under the same policy.

## Cleaning checklist

Remove or replace:

- names of anyone who wasn't speaking: residents, colleagues, councillors and suppliers. Use a role ("a resident", "the team leader") or a made-up example
- addresses, house numbers and street names that point to a person
- anything about a particular person's case or situation: health, family, money, complaints, enforcement
- opinions about named colleagues, and anything said in confidence
- small talk and off-topic discussion, which add nothing to the requirements

Keep:

- how the service works now, step by step, and who (by role) does each step
- the problems people described, and what would be better
- volumes, deadlines, seasonal peaks, rules, policies and legislation mentioned
- decisions made in the meeting, and questions left open

## What never goes to an AI assistant

- The original transcript, the recording, and the roles file.
- Anything you haven't cleaned and read through, even "just to tidy it up". Only use an AI tool on an uncleaned transcript if Information Governance has approved that tool for this kind of data.

The guardrails help, but they can't recognise names or someone's circumstances. The cleaning checklist is your job.
