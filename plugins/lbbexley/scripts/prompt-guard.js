#!/usr/bin/env node
'use strict';
// Prompt guard (Claude Code): stops a prompt that looks like it contains real
// personal data (NI, NHS or card numbers, personal email addresses) before it
// is sent. Adding [fictional] to the prompt lets made-up data through.
// Also notes when the person sends a message, so the stop gate counts its
// reviews per request rather than per turn. Messages Claude Code adds itself,
// such as a background review's report, don't count.
// Quiet outside Bexley app repositories.

const { readStdin, normalise, emit } = require('./lib/hook-io');
const { loadStandards, isBexleyProject } = require('./lib/config');
const { findPersonalData } = require('./lib/personal-data');
const { load, save } = require('./lib/state');

(async () => {
  if (process.env.LBBEXLEY_NESTED === '1') return;
  const raw = await readStdin();
  const input = normalise(raw);
  if (!isBexleyProject(input.cwd)) return;

  const source = String(raw.source ?? 'user');
  if (source === 'user' || source === 'sdk') {
    const state = load(input.cwd, input.sessionId);
    state.lastPersonPromptAt = Date.now();
    save(input.cwd, input.sessionId, state);
  }

  if (/\[fictional\]/i.test(input.prompt)) return;

  const found = findPersonalData(input.prompt, loadStandards());
  if (!found.length) return;

  const examples = found.slice(0, 3).map(f => `${f.kind} (${f.masked})`).join('; ');
  emit({
    decision: 'block',
    reason: [
      `Not sent: this looks like real personal data: ${examples}.`,
      'Don\'t put resident or staff data into the assistant. Use fictional data instead (the data-protection skill lists safe formats).',
      'If the data is made up, add [fictional] to your message and send it again.',
    ].join('\n'),
  });
})().catch(() => {
  process.exitCode = 0;
});
