'use strict';
// Per-session state for the end-of-run check, kept in the app repository at
// .lbbexley/state/ (git-ignored): which files this session changed, what the
// end-of-run reviewer has seen, problems it reported, and how many times the
// stop gate has held the assistant back.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function stateDir(root) {
  return path.join(root, '.lbbexley', 'state');
}

function fileFor(root, sessionId) {
  const safe = String(sessionId || 'session').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || 'session';
  return path.join(stateDir(root), `${safe}.json`);
}

function load(root, sessionId) {
  try {
    return JSON.parse(fs.readFileSync(fileFor(root, sessionId), 'utf8'));
  } catch {
    return { edited: [], reviewed: {}, openItems: [], blocks: 0, lastFingerprint: '', reviewRequested: '' };
  }
}

function save(root, sessionId, state) {
  try {
    fs.mkdirSync(stateDir(root), { recursive: true });
    fs.writeFileSync(fileFor(root, sessionId), JSON.stringify(state, null, 2));
  } catch {
    // State is a convenience; the pull request check is the backstop.
  }
}

function hashFile(root, rel) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex').slice(0, 16);
  } catch {
    return 'missing';
  }
}

function recordEdit(root, sessionId, rel) {
  const s = load(root, sessionId);
  if (!s.edited.includes(rel)) s.edited.push(rel);
  save(root, sessionId, s);
}

// Edited files whose current content the end-of-run reviewer hasn't seen.
function unreviewed(root, state, candidates) {
  return candidates.filter(rel => state.reviewed[rel] !== hashFile(root, rel));
}

module.exports = { stateDir, load, save, hashFile, recordEdit, unreviewed };
