#!/usr/bin/env node
'use strict';
// Bexley standards check from the command line.
//
//   node lbbexley-check.js [options] [paths...]
//
// Options:
//   --root <dir>          Repository root, for relative paths and .lbbexleyignore (default: current folder)
//   --changed [base]      Check files changed in the working tree, plus changes since <base> if given
//   --files-from <file>   Read the paths to check from a file, one per line (e.g. a git diff)
//   --release             Also check that compliance documents have no template placeholders left
//   --fail-on <level>     warning (default), error or none: the lowest severity that fails the run
//   --github              Also print GitHub Actions annotations
//   --json                Print findings as JSON instead of text
//   --config <file>       Use a different standards.json
//
// Exit codes: 0 no failing findings, 1 failing findings, 2 usage error.
// Bexley's definition of done is zero findings, so warnings fail by default.

const fs = require('fs');
const path = require('path');
const { loadStandards } = require('./lib/config');
const { collectFiles, checkPath, loadIgnoreFile, ignoreRulesFor } = require('./lib/checks');
const { changedFiles } = require('./lib/git');

function parseArgs(argv) {
  const opts = { root: process.cwd(), paths: [], failOn: 'warning', github: false, json: false, config: null, filesFrom: null, changed: false, base: null, release: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === '--root') opts.root = path.resolve(next());
    else if (a === '--files-from') opts.filesFrom = next();
    else if (a === '--fail-on') opts.failOn = next();
    else if (a === '--github') opts.github = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--release') opts.release = true;
    else if (a === '--config') opts.config = next();
    else if (a === '--changed') {
      opts.changed = true;
      if (argv[i + 1] && !argv[i + 1].startsWith('--')) opts.base = argv[++i];
    } else if (a === '--help' || a === '-h') opts.help = true;
    else if (a.startsWith('--')) throw new Error(`Unknown option ${a}`);
    else opts.paths.push(a);
  }
  if (!['error', 'warning', 'none'].includes(opts.failOn)) throw new Error('--fail-on must be warning, error or none');
  return opts;
}

function ghEscape(s, prop) {
  let out = String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  if (prop) out = out.replace(/:/g, '%3A').replace(/,/g, '%2C');
  return out;
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`${e.message}\nRun with --help for usage.\n`);
    return 2;
  }
  if (opts.help) {
    process.stdout.write(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 20).map(l => l.replace(/^\/\/ ?/, '')).join('\n') + '\n');
    return 0;
  }

  const cfg = loadStandards(opts.config);
  let inputs = opts.paths;
  if (opts.filesFrom) {
    inputs = inputs.concat(fs.readFileSync(opts.filesFrom, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean));
  }
  if (opts.changed) {
    const changed = changedFiles(opts.root, opts.base);
    if (changed === null) {
      process.stderr.write('--changed needs a git repository. Checking everything instead.\n');
      inputs.push('.');
    } else {
      inputs = inputs.concat(changed);
    }
  }
  // No paths means the whole repository, unless a (possibly empty) list came from git or a file.
  if (!inputs.length && !opts.filesFrom && !opts.changed) inputs = ['.'];
  if (opts.release) inputs.push('docs/compliance', 'AGENTS.md', 'README.md');

  const ignoreEntries = loadIgnoreFile(opts.root);
  const files = collectFiles(inputs, opts.root, cfg);
  const findings = [];
  for (const abs of files) {
    const rel = path.relative(opts.root, abs).replace(/\\/g, '/');
    findings.push(...checkPath(abs, cfg, { displayPath: rel, ignoreRules: ignoreRulesFor(rel, ignoreEntries), release: opts.release }));
  }

  const errors = findings.filter(f => f.severity === 'error').length;
  const warnings = findings.length - errors;

  if (opts.json) {
    process.stdout.write(JSON.stringify({ filesChecked: files.length, errors, warnings, findings }, null, 2) + '\n');
  } else {
    for (const f of findings) {
      process.stdout.write(`${f.file}:${f.line}  ${f.severity.padEnd(7)}  ${f.rule}  ${f.message}\n`);
    }
    const summary = findings.length
      ? `${errors} error(s), ${warnings} warning(s) in ${new Set(findings.map(f => f.file)).size} file(s); ${files.length} file(s) checked. All of them must be fixed.`
      : `No problems found in ${files.length} file(s).`;
    process.stdout.write(`${summary}\n`);
  }

  if (opts.github) {
    for (const f of findings) {
      const level = f.severity === 'error' ? 'error' : 'warning';
      process.stdout.write(`::${level} file=${ghEscape(f.file, true)},line=${f.line},title=${ghEscape('lbbexley ' + f.rule, true)}::${ghEscape(f.message)}\n`);
    }
  }

  if (opts.failOn === 'none') return 0;
  if (opts.failOn === 'warning') return findings.length ? 1 : 0;
  return errors ? 1 : 0;
}

process.exitCode = main();
