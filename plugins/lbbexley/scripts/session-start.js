#!/usr/bin/env node
'use strict';
// Session start: a short reminder of how work runs here, a prompt to finish
// setting up a new app, waiting harness-improvement ideas, and a warning during
// pre-election periods. Also notes the start time, so the stop gate knows which
// changes belong to this session. Quiet outside Bexley app repositories.

const fs = require('fs');
const path = require('path');
const { readStdin, normalise, sessionContext, harness } = require('./lib/hook-io');
const { isBexleyProject, loadElectionPeriods, londonToday } = require('./lib/config');
const { load, save } = require('./lib/state');

(async () => {
  if (process.env.LBBEXLEY_NESTED === '1') return;
  const input = normalise(await readStdin());
  const root = input.cwd;
  if (!isBexleyProject(root)) return;

  const state = load(root, input.sessionId);
  if (!state.startedAt) {
    state.startedAt = Date.now();
    save(root, input.sessionId, state);
  }

  const review = harness() === 'copilot' ? 'the lbbexley-review skill' : '/lbbexley:review';
  const parts = [
    `Bexley standards are active: dev environments and fictional data only. Work in three steps: plan (strongest model, plan mode), build, then the end-of-run check on a smaller model, which runs automatically before you finish. Zero standards findings of any severity is the definition of done; run ${review} before a pull request.`,
  ];

  try {
    const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
    if (/\{\{[^}]+\}\}/.test(agents)) {
      parts.push(`AGENTS.md still has template placeholders ({{...}}). Suggest running ${harness() === 'copilot' ? 'the lbbexley-new-app skill' : '/lbbexley:new-app'} before building anything.`);
    }
  } catch {
    // no AGENTS.md: nothing to say
  }

  try {
    const ideas = (fs.readFileSync(path.join(root, '.lbbexley', 'improvements.md'), 'utf8').match(/^- \[ \]/gm) || []).length;
    if (ideas >= 3) {
      parts.push(`${ideas} harness improvement ideas are waiting in .lbbexley/improvements.md. Suggest running ${harness() === 'copilot' ? 'the lbbexley-improve skill' : '/lbbexley:improve'} when there's a natural break.`);
    }
  } catch {
    // no ideas logged yet
  }

  const today = londonToday();
  for (const p of loadElectionPeriods()) {
    if (p && p.start <= today && today <= p.end) {
      parts.push(
        `PRE-ELECTION PERIOD: ${p.name} (${p.start} to ${p.end}). For anything public: no publicity on controversial issues; nothing that identifies views or proposals with individual councillors or political groups; be ready to suspend comments, forums and other third-party content (Publicity Code paras 33-35). Check with Democratic Services and Communications before publishing.`,
      );
    }
  }

  sessionContext(parts.join('\n'));
})().catch(() => {
  process.exitCode = 0;
});
