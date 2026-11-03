'use strict';
// Loads the Bexley standards configuration and works out whether a folder is a
// Bexley app repository (so the guardrails stay quiet in unrelated projects).

const fs = require('fs');
const path = require('path');

const PLUGIN_ROOT = path.resolve(__dirname, '..', '..');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function normHex(hex) {
  let h = String(hex).trim().replace(/^#/, '').toUpperCase();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6);
  return '#' + h;
}

function loadStandards(configPath) {
  const file = configPath || path.join(PLUGIN_ROOT, 'config', 'standards.json');
  const cfg = readJson(file);
  cfg.paletteHexes = new Set(Object.values(cfg.palette).map(normHex));
  cfg.hexToToken = new Map(Object.entries(cfg.palette).map(([k, v]) => [normHex(v), k]));
  cfg.legacyHexes = new Map(Object.entries(cfg.legacyColours || {}).map(([k, v]) => [normHex(v), k]));
  cfg.consumerDomains = new Set((cfg.consumerEmailDomains || []).map(d => d.toLowerCase()));
  return cfg;
}

function loadElectionPeriods(file) {
  try {
    const data = readJson(
      file || process.env.LBBEXLEY_ELECTIONS_FILE || path.join(PLUGIN_ROOT, 'config', 'pre-election-periods.json'),
    );
    return Array.isArray(data.periods) ? data.periods : [];
  } catch {
    return [];
  }
}

// A project uses the Bexley standards when its Claude settings enable the
// lbbexley plugin, or its AGENTS.md or CLAUDE.md mentions lbbexley.
// LBBEXLEY_ALWAYS=1 forces the guardrails on; LBBEXLEY_ALWAYS=0 turns them off.
// EVAL_LBBEXLEY_ALWAYS does the same inside plugin eval runs, which only pass
// EVAL_* variables through.
function isBexleyProject(dir) {
  const always = process.env.LBBEXLEY_ALWAYS || process.env.EVAL_LBBEXLEY_ALWAYS;
  if (always === '1') return true;
  if (always === '0') return false;
  if (!dir) return false;
  const probes = [
    path.join(dir, '.claude', 'settings.json'),
    path.join(dir, '.claude', 'settings.local.json'),
    path.join(dir, 'AGENTS.md'),
    path.join(dir, 'CLAUDE.md'),
  ];
  return probes.some(p => {
    try {
      return /lbbexley/i.test(fs.readFileSync(p, 'utf8'));
    } catch {
      return false;
    }
  });
}

// Today's date in London as YYYY-MM-DD. LBBEXLEY_TODAY overrides it for tests.
function londonToday() {
  if (process.env.LBBEXLEY_TODAY) return process.env.LBBEXLEY_TODAY;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

module.exports = { PLUGIN_ROOT, normHex, loadStandards, loadElectionPeriods, isBexleyProject, londonToday };
