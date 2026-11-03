#!/usr/bin/env node
'use strict';
// After each edit: runs the Bexley standards check on the files the assistant
// saved. Every finding, however minor, goes back to the assistant to fix
// straight away. Also records which files this session changed, for the stop
// gate and the end-of-run check. Quiet outside Bexley app repositories.

const fs = require('fs');
const path = require('path');
const { readStdin, normalise, afterTool } = require('./lib/hook-io');
const { loadStandards, isBexleyProject } = require('./lib/config');
const { checkPath, isCheckable, isIgnoredPath, loadIgnoreFile, ignoreRulesFor } = require('./lib/checks');
const { changedFiles } = require('./lib/git');
const { recordEdit } = require('./lib/state');

(async () => {
  if (process.env.LBBEXLEY_NESTED === '1') return;
  const input = normalise(await readStdin());
  const root = input.cwd;
  if (!isBexleyProject(root)) return;

  let targets = input.paths.map(p => path.resolve(root, p));
  // Some edit tools (patches) don't name a single file: check everything changed.
  if (!targets.length && /edit|write|create|patch|replace|insert/i.test(input.toolName)) {
    targets = (changedFiles(root) || []).map(p => path.resolve(root, p));
  }
  targets = targets.filter(f => fs.existsSync(f) && isCheckable(f));
  if (!targets.length) return;

  const cfg = loadStandards();
  const ignoreEntries = loadIgnoreFile(root);
  const problems = [];
  const checked = [];
  for (const file of targets) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    const inProject = rel && !rel.startsWith('..');
    if (inProject && isIgnoredPath(rel, cfg)) continue;
    if (inProject) recordEdit(root, input.sessionId, rel);
    checked.push(inProject ? rel : file);
    const findings = checkPath(file, cfg, {
      displayPath: inProject ? rel : file,
      ignoreRules: inProject ? ignoreRulesFor(rel, ignoreEntries) : new Set(),
    });
    for (const f of findings) problems.push(`- ${f.file} line ${f.line}: ${f.message} [${f.rule}]`);
  }
  if (!checked.length) return;
  if (!problems.length) {
    // Say so, so the assistant knows the check ran and doesn't need repeating.
    const names = checked.length > 3 ? `${checked.slice(0, 3).join(', ')} and ${checked.length - 3} more` : checked.join(', ');
    afterTool(`Bexley standards check passed for ${names}.`, { mustFix: false });
    return;
  }

  afterTool([
    `Bexley standards check: ${problems.length} problem(s) to fix now. The definition of done is zero findings, however minor:`,
    ...problems,
    'Fix each one. If a rule genuinely doesn\'t apply, add "lbbexley-ignore: <rule> <reason>" on that line.',
  ].join('\n'), { mustFix: true });
})().catch(() => {
  // Fail open: the stop gate and the pull request check are the backstops.
  process.exitCode = 0;
});
