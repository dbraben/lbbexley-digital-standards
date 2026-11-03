#!/usr/bin/env node
'use strict';
// Updates an app repository to a release of the Bexley standards:
//
//   npm run standards:update -- v0.3.0
//
// Downloads that release of the standards into a temporary folder, runs its
// sync (Copilot skills and agents, path rules, Copilot hooks and these
// scripts), and moves the pull request check to the same release.
// Claude Code users also update the plugin: /plugin marketplace update lbbexley-digital
// Review everything it changes in a pull request.
//
// Maintainers can try a release before pushing it by pointing
// LBBEXLEY_STANDARDS_SOURCE at a local clone of the standards repository.

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadStandards } = require('./lib/config');

function main() {
  const version = process.argv[2];
  if (!version || !/^(v\d+\.\d+\.\d+|main)$/.test(version)) {
    process.stderr.write('Usage: npm run standards:update -- v0.3.0\n');
    return 2;
  }
  const root = process.cwd();
  const repo = loadStandards().standardsRepository || 'dbraben/lbbexley-digital-standards';
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lbbexley-standards-'));
  try {
    const source = process.env.LBBEXLEY_STANDARDS_SOURCE || `https://github.com/${repo}.git`;
    const clone = spawnSync('git', ['clone', '--quiet', '--depth', '1', '--branch', version, source, tmp], { stdio: 'inherit', windowsHide: true });
    if (clone.status !== 0) {
      process.stderr.write(`Couldn't download ${source} at ${version}. Check the version exists and that you can reach GitHub.\n`);
      return 1;
    }
    const sync = spawnSync(process.execPath, [path.join(tmp, 'scripts', 'sync-app.js'), '--target', root], { stdio: 'inherit' });
    if (sync.status !== 0) return 1;

    const workflow = path.join(root, '.github', 'workflows', 'quality.yml');
    if (fs.existsSync(workflow)) {
      const text = fs.readFileSync(workflow, 'utf8')
        .replace(/(standards-check\.yml@)\S+/, `$1${version}`)
        .replace(/(standards-ref:\s*)\S+/, `$1${version}`);
      fs.writeFileSync(workflow, text);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  process.stdout.write(`Updated to the Bexley standards ${version}. Run npm run check:all, review the changes and open a pull request.\nClaude Code users: /plugin marketplace update lbbexley-digital\n`);
  return 0;
}

process.exitCode = main();
