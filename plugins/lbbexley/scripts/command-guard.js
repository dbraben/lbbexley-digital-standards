#!/usr/bin/env node
'use strict';
// Before a command runs in the terminal:
//   - git push: blocks a push that could overwrite or delete work on GitHub (a
//     force push, a delete, a mirror or prune push, or a refspec starting with
//     + or :), and asks the person before a push to anywhere other than one of
//     the repository's own remotes. An ordinary push goes ahead, so the
//     assistant can push the work without asking.
//   - pac commands that read from or write to an environment (pac pages upload
//     or download, pac solution sync, clone or add-solution-component): checks
//     the command goes to the dev environment named in AGENTS.md, so nothing is
//     uploaded to test or production, and the repository only ever holds the
//     dev version. A command that names another environment itself, with
//     --environment or -env, is blocked. Otherwise the environment pac is
//     signed in to is checked (pac env who --json, or the text output on older
//     versions). If AGENTS.md doesn't name a dev environment yet, or pac can't
//     say where it's connected, the person is asked.
// Other commands, and tools that aren't commands, are let through without comment.

const path = require('path');
const { spawnSync } = require('child_process');
const { readStdin, normalise, toolDecision } = require('./lib/hook-io');
const { isBexleyProject } = require('./lib/config');
const { usesPacEnvironment, pacEnvironmentArgument, devEnvironmentUrl, host } = require('./lib/environment');

const SEP = Symbol('separator');

// The words of a command line, with quoted text kept together and each
// separator (; & | brackets, a new line) as a word of its own.
function words(command) {
  const out = [];
  let cur = '';
  let started = false;
  let quote = null;
  const flush = () => {
    if (started) out.push(cur);
    cur = '';
    started = false;
  };
  for (const c of command) {
    if (quote) {
      if (c === quote) quote = null;
      else cur += c;
    } else if (c === '"' || c === "'") {
      quote = c;
      started = true;
    } else if (c === '&' && /[<>]$/.test(cur)) {
      // Part of a redirection, such as 2>&1.
      cur += c;
    } else if (/[;&|()\n]/.test(c)) {
      flush();
      out.push(SEP);
    } else if (/\s/.test(c)) {
      flush();
    } else {
      cur += c;
      started = true;
    }
  }
  flush();
  return out;
}

// git's own options that take a value, before the command name.
const GIT_VALUE_OPTIONS = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--config-env']);
// git push options that take a value as the next word.
const PUSH_VALUE_OPTIONS = new Set(['-o', '--push-option', '--repo', '--receive-pack', '--exec']);

// The arguments of each git push in a command line.
function pushes(command) {
  const w = words(command);
  const found = [];
  for (let i = 0; i < w.length; i++) {
    if (typeof w[i] !== 'string' || !/^git(\.exe)?$/i.test(path.basename(w[i]))) continue;
    let j = i + 1;
    while (typeof w[j] === 'string' && w[j].startsWith('-')) j += GIT_VALUE_OPTIONS.has(w[j]) ? 2 : 1;
    if (w[j] !== 'push') continue;
    const args = [];
    for (j += 1; j < w.length && w[j] !== SEP; j++) args.push(w[j]);
    found.push(args);
  }
  return found;
}

// 'deny' for a push that could overwrite or delete work, the repository it
// goes to otherwise (or '' for the default).
function readPush(args) {
  const positional = [];
  let repo = '';
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    if (a === '--') {
      positional.push(...args.slice(k + 1));
      break;
    }
    if (a.startsWith('--')) {
      const name = a.split('=')[0];
      if (/^--(force|force-with-lease|force-if-includes|delete|mirror|prune)$/.test(name)) return { risky: true };
      if (name === '--repo') repo = a.includes('=') ? a.slice(a.indexOf('=') + 1) : args[++k] || '';
      else if (PUSH_VALUE_OPTIONS.has(name) && !a.includes('=')) k++;
      continue;
    }
    if (/^\d*[<>]/.test(a)) {
      // A redirection, such as 2>&1 or > log.txt.
      if (/^\d*[<>]+&?$/.test(a)) k++;
      continue;
    }
    if (a.startsWith('-') && a.length > 1) {
      if (a === '-o') {
        k++;
        continue;
      }
      // Short options, alone or together, such as -f, -d or -uf.
      if (/[fd]/.test(a.slice(1))) return { risky: true };
      continue;
    }
    positional.push(a);
  }
  if (positional.some(p => p.startsWith('+') || p.startsWith(':'))) return { risky: true };
  return { risky: false, repository: positional[0] || repo };
}

function remotes(cwd) {
  const res = spawnSync('git', ['remote'], { cwd, encoding: 'utf8', windowsHide: true, timeout: 10 * 1000 });
  if (res.error || res.status !== 0) return null;
  return `${res.stdout || ''}`.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

const SIGN_IN = /login\.(microsoftonline\.com|windows\.net|microsoftonline\.us)/i;

// An environment's address in what pac printed: the JSON field that names the
// organisation's URL, the "Org URL" line, or failing those the first https
// address that isn't a sign-in authority.
function environmentIn(output) {
  const text = `${output || ''}`;
  try {
    const json = JSON.parse(text);
    const walk = value => {
      if (!value || typeof value !== 'object') return null;
      for (const [key, v] of Object.entries(value)) {
        if (typeof v === 'string' && /url/i.test(key) && /^https:\/\//i.test(v) && !SIGN_IN.test(v)) return v;
      }
      for (const v of Object.values(value)) {
        const found = walk(v);
        if (found) return found;
      }
      return null;
    };
    const fromJson = walk(json);
    if (fromJson) return fromJson;
  } catch {
    // Not JSON: read the text.
  }
  const line = text.match(/^\s*(?:Org|Organi[sz]ation|Environment)\s*URL\s*:?\s*(https:\/\/[^\s'"]+)/im);
  if (line) return line[1];
  const urls = text.match(/https:\/\/[^\s'"]+/gi) || [];
  return urls.find(u => !SIGN_IN.test(u)) || null;
}

// The environment pac is connected to: `pac env who --json`, then the text
// forms, with `pac org who` for older versions.
function currentEnvironment(cwd) {
  for (const args of [['env', 'who', '--json'], ['env', 'who'], ['org', 'who']]) {
    const res = spawnSync('pac', args, { cwd, encoding: 'utf8', windowsHide: true, shell: process.platform === 'win32', timeout: 30 * 1000 });
    if (res.error || res.status !== 0) continue;
    const url = environmentIn(res.stdout);
    if (url) return url;
  }
  return null;
}

function checkPushes(command, root) {
  const found = pushes(command).map(readPush);
  if (found.some(p => p.risky)) {
    toolDecision('deny', 'Blocked by the Bexley guardrails: this push could overwrite or delete work on GitHub (a force push, a delete, a mirror or prune push, or a refspec starting with + or :). Push with plain git push. If GitHub rejects the push, tell the person why rather than forcing it.');
    return true;
  }
  const named = found.map(p => p.repository).filter(Boolean);
  if (!named.length) return false;
  const known = remotes(root) || [];
  const elsewhere = named.find(r => !known.includes(r));
  if (elsewhere) {
    toolDecision('ask', `Bexley guardrails: this push goes to ${elsewhere}, which isn't one of this repository's remotes. Continue only if the person asked for it.`);
    return true;
  }
  return false;
}

async function checkPac(command, root) {
  const dev = devEnvironmentUrl(root);
  if (!dev) {
    toolDecision('ask', 'Bexley guardrails: AGENTS.md doesn\'t name a dev environment yet, so the check can\'t confirm where this pac command goes. Continue only if pac is connected to the dev environment.');
    return;
  }
  // The command names an environment itself: it must be the dev one. An
  // environment ID or name can't be checked here, so the person is asked.
  const named = pacEnvironmentArgument(command);
  if (named) {
    if (!/^https?:\/\//i.test(named)) {
      toolDecision('ask', `Bexley guardrails: this pac command names the environment "${named}", which the check can't match against the dev environment in AGENTS.md (${dev}). Continue only if it's the same environment, or leave --environment out so pac uses the one it's signed in to.`);
      return;
    }
    if (host(named) !== host(dev)) {
      toolDecision('deny', `Blocked by the Bexley guardrails: this pac command names ${named}, not the dev environment in AGENTS.md (${dev}). Leave --environment out, or name the dev environment.`);
      return;
    }
  }
  const current = currentEnvironment(root);
  if (!current) {
    toolDecision('ask', `Bexley guardrails: pac couldn't say which environment it's connected to. Continue only if it's the dev environment, ${dev}.`);
    return;
  }
  if (host(current) !== host(dev)) {
    toolDecision('deny', `Blocked by the Bexley guardrails: pac is connected to ${current}, not the dev environment in AGENTS.md (${dev}). Switch to it first with pac env select --environment ${dev} (or pac auth create --environment ${dev} if you haven't signed in to it), then run this again.`);
  }
}

(async () => {
  if (process.env.LBBEXLEY_NESTED === '1') return;
  const input = normalise(await readStdin());
  const command = typeof input.toolInput.command === 'string' ? input.toolInput.command : '';
  const git = /\bgit(\.exe)?\b/i.test(command) && /\bpush\b/.test(command);
  const pac = usesPacEnvironment(command);
  if (!git && !pac) return;
  const root = input.cwd;
  if (!isBexleyProject(root)) return;
  if (git && checkPushes(command, root)) return;
  if (pac) await checkPac(command, root);
})().catch(() => {
  process.exitCode = 0;
});
