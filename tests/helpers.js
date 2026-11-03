'use strict';
// Shared helpers for the standards repository tests (run with: node --test tests/).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const PLUGIN = path.join(REPO, 'plugins', 'lbbexley');
const SCRIPTS = path.join(PLUGIN, 'scripts');

// A temporary folder with the given files ({ 'relative/path': 'content' }).
function tempRepo(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lbbexley-test-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return dir;
}

// A temporary Bexley app repository (AGENTS.md mentions lbbexley).
function bexleyRepo(files = {}) {
  return tempRepo({ 'AGENTS.md': '# Test service\n\nBexley standards apply (lbbexley plugin).\n', ...files });
}

function run(script, args = [], { input, env = {}, cwd } = {}) {
  const res = spawnSync(process.execPath, [script, ...args], {
    input: input === undefined ? '' : typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8',
    cwd: cwd || REPO,
    env: { ...process.env, LBBEXLEY_ALWAYS: '', EVAL_LBBEXLEY_ALWAYS: '', CLAUDE_PROJECT_DIR: '', ...env },
  });
  return { code: res.status, stdout: res.stdout, stderr: res.stderr };
}

// Valid-looking identifiers built at run time, so no real-looking personal
// data is stored in the repository.
function nhsNumber(first9) {
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(first9[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check === 11) check = 0;
  if (check === 10) return null;
  return first9 + check;
}

function luhnNumber(first15) {
  for (let d = 0; d <= 9; d++) {
    const n = first15 + d;
    let sum = 0;
    let dbl = false;
    for (let i = n.length - 1; i >= 0; i--) {
      let x = Number(n[i]);
      if (dbl) {
        x *= 2;
        if (x > 9) x -= 9;
      }
      sum += x;
      dbl = !dbl;
    }
    if (sum % 10 === 0) return n;
  }
  return null;
}

function spaced(nhs) {
  return `${nhs.slice(0, 3)} ${nhs.slice(3, 6)} ${nhs.slice(6)}`;
}

// A real-looking personal email address and National Insurance number, also
// built at run time.
const personalEmail = () => ['jo.bloggs', 'gmail.com'].join('@');
const niNumber = () => ['AB', '12', '34', '56', 'C'].join(' ');

module.exports = { REPO, PLUGIN, SCRIPTS, tempRepo, bexleyRepo, run, nhsNumber, luhnNumber, spaced, personalEmail, niNumber };
