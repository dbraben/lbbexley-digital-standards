#!/usr/bin/env node
'use strict';
// Writes plugins/lbbexley/skills/review/rules.md from the rule list in the
// standards check, so the documentation can't drift from the code.
//   node scripts/build-rules-doc.js          write the file
//   node scripts/build-rules-doc.js --check  exit 1 if it's out of date

const fs = require('fs');
const path = require('path');
const { RULES } = require('../plugins/lbbexley/scripts/lib/checks');

const OUT = path.join(__dirname, '..', 'plugins', 'lbbexley', 'skills', 'review', 'rules.md');

function render() {
  const rows = Object.entries(RULES).map(([id, r]) => `| \`${id}\` | ${r.severity} | ${r.wcag || ''} | ${r.about} |`);
  return [
    '# What the standards check checks',
    '',
    'Generated from the standards check (`scripts/lib/checks.js`). Severity sets the order to fix things in, not whether to fix them: the definition of done is zero findings of any severity.',
    '',
    'To suppress a finding that genuinely doesn\'t apply, put `lbbexley-ignore: <rule> <reason>` on the line or the line above. A suppression without a reason is itself a finding. Personal-data findings can only be suppressed line by line.',
    '',
    '| Rule | Severity | WCAG 2.2 | Finds |',
    '|---|---|---|---|',
    ...rows,
    '',
  ].join('\n');
}

const text = render();
if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (current !== text) {
    process.stderr.write('rules.md is out of date: run node scripts/build-rules-doc.js\n');
    process.exitCode = 1;
  }
} else {
  fs.writeFileSync(OUT, text);
  process.stdout.write(`Wrote ${path.relative(process.cwd(), OUT)} (${Object.keys(RULES).length} rules)\n`);
}
