#!/usr/bin/env node
'use strict';
// Updates an app repository to a release of the Bexley standards:
//
//   npm run standards:update -- v0.4.0
//
// Downloads that release of the standards into a temporary folder, runs its
// sync (Copilot skills and agents, path rules, Copilot hooks and these
// scripts), and moves the check on GitHub and the Claude Code plugin's
// marketplace (.claude/settings.json, and .claude/settings.local.json if the
// marketplace was added there) to the same release.
// If Claude Code is installed, it then moves the plugin to that release too:
//   claude plugin marketplace add dbraben/lbbexley-digital-standards#v0.5.0 --scope project
//   claude plugin update lbbexley@lbbexley-digital
// If it can't, it gives the two commands to type, with --scope local so they
// don't rewrite .claude/settings.json. Commit the update as a change of its
// own. LBBEXLEY_SKIP_PLUGIN_UPDATE=1 leaves the plugin alone.
//
// Maintainers can try a release before pushing it by pointing
// LBBEXLEY_STANDARDS_SOURCE at a local clone of the standards repository.

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadStandards } = require('./lib/config');

// The same JSON, whatever the order of its keys.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}

// Moves Claude Code's lbbexley plugin to the release, if Claude Code is
// installed. The CLI rewrites .claude/settings.json in an order of its own, so
// the file is put back as this script wrote it when nothing else changed.
function updatePlugin(root, repo, version, settingsFile, written) {
  const claude = args => spawnSync('claude', args, { cwd: root, encoding: 'utf8', windowsHide: true, shell: process.platform === 'win32', timeout: 3 * 60 * 1000 });
  const probe = claude(['--version']);
  if (probe.error || probe.status !== 0) return false;
  const add = claude(['plugin', 'marketplace', 'add', `${repo}#${version}`, '--scope', 'project']);
  const update = add.status === 0 ? claude(['plugin', 'update', 'lbbexley@lbbexley-digital']) : null;
  try {
    const now = fs.readFileSync(settingsFile, 'utf8');
    if (now !== written && JSON.stringify(canonical(JSON.parse(now))) === JSON.stringify(canonical(JSON.parse(written)))) fs.writeFileSync(settingsFile, written);
  } catch {
    // Leave the file as the CLI wrote it.
  }
  return Boolean(update && update.status === 0);
}

function main() {
  const version = process.argv[2];
  if (!version || !/^(v\d+\.\d+\.\d+|main)$/.test(version)) {
    process.stderr.write('Usage: npm run standards:update -- v0.5.0\n');
    return 2;
  }
  const root = process.cwd();
  const repo = loadStandards().standardsRepository || 'dbraben/lbbexley-digital-standards';
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lbbexley-standards-'));
  let settingsFile = null;
  let written = null;
  try {
    const source = process.env.LBBEXLEY_STANDARDS_SOURCE || `https://github.com/${repo}.git`;
    const clone = spawnSync('git', ['-c', 'advice.detachedHead=false', 'clone', '--quiet', '--depth', '1', '--branch', version, source, tmp], { stdio: 'inherit', windowsHide: true });
    if (clone.status !== 0) {
      process.stderr.write(`Couldn't download ${source} at ${version}. Check the version exists and that you can reach GitHub.\n`);
      return 1;
    }

    // The release Claude Code installs the plugin from, first, so the sync
    // doesn't ask for it to be pinned.
    settingsFile = path.join(root, '.claude', 'settings.json');
    if (fs.existsSync(settingsFile)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
        const entry = settings.extraKnownMarketplaces && settings.extraKnownMarketplaces['lbbexley-digital'];
        if (entry && entry.source && entry.source.source === 'github') {
          entry.source.ref = version;
          written = `${JSON.stringify(settings, null, 2)}\n`;
          fs.writeFileSync(settingsFile, written);
        }
      } catch {
        process.stderr.write('.claude/settings.json isn\'t valid JSON, so the Claude Code plugin\'s release wasn\'t changed. Fix the file, then run this again.\n');
        return 1;
      }
    }

    // A marketplace added for this computer only (claude plugin marketplace add
    // --scope local) would otherwise go on naming the old release.
    const localFile = path.join(root, '.claude', 'settings.local.json');
    if (fs.existsSync(localFile)) {
      try {
        const local = JSON.parse(fs.readFileSync(localFile, 'utf8'));
        const entry = local.extraKnownMarketplaces && local.extraKnownMarketplaces['lbbexley-digital'];
        if (entry && entry.source && entry.source.source === 'github' && entry.source.ref !== version) {
          entry.source.ref = version;
          fs.writeFileSync(localFile, `${JSON.stringify(local, null, 2)}\n`);
        }
      } catch {
        process.stderr.write('.claude/settings.local.json isn\'t valid JSON, so it was left as it is. Claude Code reports what\'s wrong with it.\n');
      }
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
  const lines = [`Updated to the Bexley standards ${version}. Run npm run check:all, then commit the update as a change of its own.`];
  if (written && process.env.LBBEXLEY_SKIP_PLUGIN_UPDATE !== '1' && updatePlugin(root, repo, version, settingsFile, written)) {
    lines.push(`Claude Code's lbbexley plugin is on ${version} too: start Claude Code again to load it.`);
  } else if (written) {
    lines.push(
      'Claude Code users: move the plugin to this release too. In a terminal in this repository, run these two commands, then start Claude Code again:',
      `  claude plugin marketplace add ${repo}#${version} --scope local`,
      '  claude plugin update lbbexley@lbbexley-digital',
    );
  }
  process.stdout.write(`${lines.join('\n')}\n`);
  return 0;
}

process.exitCode = main();
