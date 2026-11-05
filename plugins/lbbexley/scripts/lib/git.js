'use strict';
// Files changed in the working tree: staged, unstaged and untracked, plus
// anything changed since a base branch when one is given.

const { spawnSync } = require('child_process');

function git(root, args) {
  const res = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
  return res.status === 0 ? res.stdout : null;
}

function isRepo(root) {
  return git(root, ['rev-parse', '--is-inside-work-tree']) !== null;
}

function changedFiles(root, base) {
  const out = new Set();
  const status = git(root, ['status', '--porcelain', '--untracked-files=all']);
  if (status === null) return null;
  for (const line of status.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith(' D') || line.startsWith('D ')) continue;
    let p = line.slice(3);
    if (p.includes(' -> ')) p = p.split(' -> ')[1];
    out.add(p.replace(/^"|"$/g, ''));
  }
  if (base) {
    const diff = git(root, ['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`]);
    if (diff) for (const p of diff.split(/\r?\n/)) if (p.trim()) out.add(p.trim());
  }
  return [...out];
}

// Committed files that have been deleted and the deletion not yet committed,
// staged or not, including a file changed and staged before it was deleted.
function deletedFiles(root) {
  const status = git(root, ['status', '--porcelain', '--untracked-files=no']);
  if (status === null) return null;
  const out = [];
  for (const line of status.split(/\r?\n/)) {
    const [index, tree] = [line[0], line[1]];
    if ((index === 'D' || tree === 'D') && index !== 'A' && index !== 'R' && index !== 'C') out.push(line.slice(3).replace(/^"|"$/g, ''));
  }
  return out;
}

// Does the repository have a remote, such as GitHub, to push to?
function hasRemote(root) {
  const remotes = git(root, ['remote']);
  return Boolean(remotes && remotes.trim());
}

// The current branch, or null when detached or outside a repository.
function currentBranch(root) {
  const out = git(root, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
  return out ? out.trim() : null;
}

// How many commits the current branch has that its upstream doesn't: 0 when
// they match, null when the branch has no upstream yet (never pushed).
function commitsAhead(root) {
  const out = git(root, ['rev-list', '--count', '@{upstream}..HEAD']);
  if (out === null) return null;
  const n = Number(out.trim());
  return Number.isFinite(n) ? n : null;
}

// A unified diff of tracked changes, for the end-of-run reviewer to read.
function workingDiff(root, files, maxBytes = 60000) {
  const diff = git(root, ['diff', 'HEAD', '--', ...files]) || '';
  return diff.length > maxBytes ? diff.slice(0, maxBytes) + '\n[diff shortened]\n' : diff;
}

module.exports = { isRepo, changedFiles, deletedFiles, hasRemote, currentBranch, commitsAhead, workingDiff };
