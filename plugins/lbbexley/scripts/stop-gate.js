#!/usr/bin/env node
'use strict';
// End-of-run gate. Runs when the assistant tries to finish a turn.
//
//  1. Standards check on every file changed in this run. Any finding, however
//     minor, keeps the assistant working until it's fixed.
//  2. Problems the end-of-run reviewer reported must be fixed: the file has
//     to change before the assistant can finish.
//  3. Files changed since the last review need a review by the smaller model:
//     the lbbexley:end-of-run-reviewer agent (Haiku) in Claude Code, or the
//     lbbexley-check agent in Copilot.
//
// Plan mode is left alone. Two limits stop it going round in circles, and in
// both cases the person is told what's outstanding:
//   - standards problems that are still there after three attempts
//   - reviewer problems the assistant has explained rather than fixed
// The review runs at most five times in one turn (LBBEXLEY_REVIEW_ROUNDS):
// anything changed after that is reviewed at the end of the next turn.
// LBBEXLEY_END_OF_RUN=0 turns off step 3 (the standards gate always runs).

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { readStdin, normalise, harness, blockStop, allowStop } = require('./lib/hook-io');
const { loadStandards, isBexleyProject } = require('./lib/config');
const { checkPath, isCheckable, isIgnoredPath, loadIgnoreFile, ignoreRulesFor } = require('./lib/checks');
const { changedFiles, workingDiff } = require('./lib/git');
const { stateDir, load, save, hashFile, unreviewed } = require('./lib/state');

const MAX_SAME_HOLDS = 3;
const MAX_REVIEW_ROUNDS = Math.max(1, Number(process.env.LBBEXLEY_REVIEW_ROUNDS) || 5);

function fingerprint(parts) {
  return crypto.createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 16);
}

function writeReviewRequest(root, files, sessionId) {
  const diff = workingDiff(root, files);
  const text = [
    '# End-of-run review request',
    '',
    `Session ${sessionId}. Review only these files, which changed in this run:`,
    '',
    ...files.map(f => `- ${f}`),
    '',
    'New files appear in full when you read them. Changes to tracked files:',
    '',
    '```diff',
    diff.trim() || '(no tracked changes: the files are new)',
    '```',
    '',
  ].join('\n');
  fs.mkdirSync(stateDir(root), { recursive: true });
  fs.writeFileSync(path.join(stateDir(root), 'review-request.md'), text);
}

(async () => {
  if (process.env.LBBEXLEY_NESTED === '1') return;
  const raw = await readStdin();
  const input = normalise(raw);
  const root = input.cwd;
  if (!isBexleyProject(root)) return;
  if (String(raw.permission_mode || raw.permissionMode || '') === 'plan') return;

  const cfg = loadStandards();
  const state = load(root, input.sessionId);
  const startedAt = state.startedAt || 0;
  // A new turn: the person sent a message, so the review can run again.
  if (!input.stopHookActive) state.reviewRounds = 0;
  const copilot = harness() === 'copilot';
  const reviewCommand = copilot ? '/lbbexley-review' : '/lbbexley:review';
  const exists = rel => fs.existsSync(path.join(root, rel));
  const usable = rel => exists(rel) && isCheckable(rel) && !isIgnoredPath(rel, cfg);

  // This run's files: edited through the assistant's edit tools, or changed on
  // disk since the session started (for example by a command).
  const fromGit = (changedFiles(root) || []).filter(rel => {
    try {
      return fs.statSync(path.join(root, rel)).mtimeMs >= startedAt - 2000;
    } catch {
      return false;
    }
  });
  const runFiles = [...new Set([...state.edited, ...fromGit])].filter(usable).sort();

  // 1. The standards check.
  const ignoreEntries = loadIgnoreFile(root);
  const problems = [];
  for (const rel of runFiles) {
    for (const f of checkPath(path.join(root, rel), cfg, { displayPath: rel, ignoreRules: ignoreRulesFor(rel, ignoreEntries) })) {
      problems.push(`- ${f.file} line ${f.line}: ${f.message} [${f.rule}]`);
    }
  }

  // 2. Problems the reviewer reported in files that haven't changed since.
  const stillOpen = (state.openItems || []).filter(item => item.file && hashFile(root, item.file) === item.hash);

  // 3. Files the reviewer hasn't seen in their current form. The harness's own
  // files (.lbbexley/, such as the improvement ideas the review itself logs)
  // get the standards check above but not a review.
  const reviewOn = (process.env.LBBEXLEY_END_OF_RUN || process.env.EVAL_LBBEXLEY_END_OF_RUN) !== '0';
  const unseen = reviewOn ? unreviewed(root, state, runFiles.filter(rel => !rel.startsWith('.lbbexley/'))) : [];
  const capped = unseen.length > 0 && (state.reviewRounds || 0) >= MAX_REVIEW_ROUNDS;
  const needReview = capped ? [] : unseen;

  if (!problems.length && !stillOpen.length && !needReview.length) {
    const summary = state.lastReview && !state.lastReview.announced ? state.lastReview : null;
    state.holds = 0;
    state.lastFingerprint = '';
    if (summary) state.lastReview.announced = true;
    save(root, input.sessionId, state);
    const logged = state.ideasLogged || 0;
    const improve = copilot ? 'the lbbexley-improve skill' : '/lbbexley:improve';
    const ideas = logged ? ` ${logged} idea(s) for improving the harness logged in .lbbexley/improvements.md this session: use ${improve} to work through them.` : '';
    if (capped) {
      allowStop(`Bexley end-of-run check: the standards check is clean, and the review on the smaller model has run ${state.reviewRounds} times in this turn, which is the limit. Its last findings were fixed, but those fixes haven't been reviewed yet (${unseen.join(', ')}). They'll be reviewed at the end of your next request, or run ${reviewCommand} now.${ideas}`);
    } else if (summary) {
      allowStop(`Bexley end-of-run check passed: standards check clean, and the review on the smaller model found nothing outstanding.${ideas}`);
    }
    return;
  }

  // Loop guard: the same outstanding list again means the assistant can't or
  // won't fix it. Standards problems get three attempts; reviewer problems it
  // has explained rather than fixed get one. Then it stops and the person is told.
  const fp = fingerprint({ problems, stillOpen: stillOpen.map(i => i.problem), needReview });
  state.holds = fp === state.lastFingerprint ? (state.holds || 0) + 1 : 1;
  state.lastFingerprint = fp;

  // Copilot can't confirm the review ran, so it's asked once per set of changes.
  if (!problems.length && !stillOpen.length && copilot && state.reviewRequested === fp) {
    for (const rel of needReview) state.reviewed[rel] = hashFile(root, rel);
    save(root, input.sessionId, state);
    return;
  }

  const limit = problems.length || !stillOpen.length ? MAX_SAME_HOLDS : 1;
  if (state.holds > limit) {
    state.holds = 0;
    save(root, input.sessionId, state);
    const item = i => `- ${i.file}${i.line ? ` line ${i.line}` : ''}: ${i.problem}`;
    if (problems.length) {
      allowStop(`Bexley checks: stopped with ${problems.length} standards problem(s) still outstanding. They must be fixed before this work is done:\n${problems.join('\n')}`);
    } else if (stillOpen.length) {
      allowStop(`Bexley checks: the end-of-run review reported ${stillOpen.length} problem(s) that weren't fixed. Read the explanation above and decide whether they need fixing before this work is done:\n${stillOpen.map(item).join('\n')}`);
    } else {
      allowStop(`Bexley checks: the end-of-run review didn't run. Run ${reviewCommand} before you call this work done.`);
    }
    return;
  }

  let reason;
  if (problems.length) {
    reason = [
      `Not finished: the Bexley standards check found ${problems.length} problem(s) in files changed in this run. The definition of done is zero findings, however minor. Fix every one, then finish:`,
      ...problems,
    ].join('\n');
  } else if (stillOpen.length) {
    reason = [
      'Not finished: the end-of-run review reported problems that haven\'t been fixed yet:',
      ...stillOpen.map(i => `- ${i.file}${i.line ? ` line ${i.line}` : ''}: ${i.problem}${i.fix ? ` Fix: ${i.fix}` : ''}`),
      "Fix them. If you're sure one is wrong, explain why to the person instead of changing the file.",
    ].join('\n');
  } else {
    writeReviewRequest(root, needReview, input.sessionId);
    state.reviewRequested = fp;
    state.reviewRounds = (state.reviewRounds || 0) + 1;
    const who = copilot
      ? 'hand this run\'s changes to the lbbexley-check agent (it runs on a smaller model)'
      : 'run the lbbexley:end-of-run-reviewer agent (it runs on Haiku, a smaller model) on this run\'s changes';
    reason = [
      `End-of-run check: before finishing, ${who}. It reads .lbbexley/state/review-request.md, which lists the ${needReview.length} file(s) changed:`,
      ...needReview.map(f => `- ${f}`),
      'Fix every problem it reports, however minor, then finish. Its ideas for improving the harness are logged automatically.',
    ].join('\n');
  }
  save(root, input.sessionId, state);
  blockStop(reason);
})().catch(() => {
  process.exitCode = 0;
});
