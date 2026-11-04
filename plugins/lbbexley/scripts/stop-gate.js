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
// Claude Code runs the reviewer in the background, so the assistant's turn can
// end while the review is still going. The gate waits for it rather than
// asking again: the review's report starts a turn of its own, and the gate runs
// again at the end of that turn.
//
// Plan mode is left alone. Two limits stop it going round in circles, and in
// both cases the person is told what's outstanding:
//   - standards problems that are still there after three attempts
//   - reviewer problems the assistant has explained rather than fixed
// The review runs at most five times for each request from the person
// (LBBEXLEY_REVIEW_ROUNDS): anything changed after that is reviewed at the end
// of their next request.
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
// A review that started but never reported is given up on after this long.
const REVIEW_TIMEOUT_MS = 15 * 60 * 1000;
const REVIEWER = /end-of-run-reviewer/i;
const FINISHED = /^(completed|done|failed|error|killed|cancelled|canceled|stopped)$/i;

function fingerprint(parts) {
  return crypto.createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 16);
}

// Is the end-of-run reviewer running in the background? Claude Code lists the
// tasks still in flight when the assistant stops; without that list, use the
// start and finish times the review recorder keeps.
function reviewRunning(raw, state) {
  const tasks = raw.background_tasks ?? raw.backgroundTasks;
  if (Array.isArray(tasks)) {
    return tasks.some(t => t && REVIEWER.test(String(t.agent_type ?? t.agentType ?? '')) && !FINISHED.test(String(t.status || '')));
  }
  const started = Number(state.reviewStartedAt) || 0;
  const finished = Number(state.reviewFinishedAt) || 0;
  return started > finished && Date.now() - started < REVIEW_TIMEOUT_MS;
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
  // A new request from the person: the review can run again. A background
  // review's report starts a turn of its own, so only the person's own messages
  // count (the prompt guard records them). Without that record, every new turn
  // counts as a new request.
  const personAt = state.lastPersonPromptAt;
  if (personAt === undefined ? !input.stopHookActive : state.roundsFor !== personAt) {
    state.reviewRounds = 0;
    if (personAt !== undefined) state.roundsFor = personAt;
  }
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
    const summary = state.lastReview && !state.lastReview.announced && state.lastReview.readable !== false ? state.lastReview : null;
    state.holds = 0;
    state.lastFingerprint = '';
    if (summary) state.lastReview.announced = true;
    save(root, input.sessionId, state);
    const logged = state.ideasLogged || 0;
    const improve = copilot ? 'the lbbexley-improve skill' : '/lbbexley:improve';
    const ideas = logged ? ` ${logged} idea(s) for improving the harness logged in .lbbexley/improvements.md this session: use ${improve} to work through them.` : '';
    if (capped) {
      allowStop(`Bexley end-of-run check: the standards check is clean, and the review on the smaller model has run ${state.reviewRounds} times for this request, which is the limit. Its last findings were fixed, but those fixes haven't been reviewed yet (${unseen.join(', ')}). They'll be reviewed at the end of your next request, or run ${reviewCommand} now.${ideas}`);
    } else if (summary) {
      allowStop(`Bexley end-of-run check passed: standards check clean, and the review on the smaller model found nothing outstanding.${ideas}`);
    }
    return;
  }

  // The review the gate asked for is still running in the background. Let the
  // turn end: the review's report starts the next one, and the gate runs again
  // then. Sending the assistant back now would only start a duplicate review.
  if (!problems.length && !stillOpen.length && !copilot && reviewRunning(raw, state)) {
    save(root, input.sessionId, state);
    allowStop('Bexley end-of-run check: the review on the smaller model is still running. When it reports, the assistant fixes anything it finds before this work is done.');
    return;
  }

  // Loop guard: the same outstanding list again means the assistant can't or
  // won't fix it. Standards problems get three attempts; reviewer problems it
  // has explained rather than fixed get one. Then it stops and the person is told.
  // The hashes are part of the fingerprint, so a file changed after a request
  // is a new request, never accepted as the old one.
  const needReviewHashes = Object.fromEntries(needReview.map(rel => [rel, hashFile(root, rel)]));
  const fp = fingerprint({ problems, stillOpen: stillOpen.map(i => i.problem), needReview: needReviewHashes });
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
    } else if (state.lastReview && state.lastReview.readable === false) {
      allowStop(`Bexley checks: the end-of-run review didn't finish, because its report couldn't be read. The files changed in this run haven't been reviewed. Run ${reviewCommand} again before you call this work done.`);
    } else {
      allowStop(`Bexley checks: the end-of-run review didn't run on ${needReview.join(', ')}. Run ${reviewCommand} before you call this work done.`);
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
    state.pendingReview = { fp, files: needReviewHashes };
    state.reviewRequested = fp;
    state.reviewRounds = (state.reviewRounds || 0) + 1;
    const who = copilot
      ? 'hand this run\'s changes to the lbbexley-check agent (it runs on a smaller model)'
      : 'run the lbbexley:end-of-run-reviewer agent (it runs on Haiku, a smaller model) on this run\'s changes';
    reason = [
      `End-of-run check: before finishing, ${who}. It reads .lbbexley/state/review-request.md, which lists the ${needReview.length} file(s) changed:`,
      ...needReview.map(f => `- ${f}`),
      ...(copilot ? [] : ['Start it once. If it runs in the background, end your turn: its report comes back to you when it finishes.']),
      'Fix every problem it reports, however minor, then finish. Its ideas for improving the harness are logged automatically.',
    ].join('\n');
  }
  save(root, input.sessionId, state);
  blockStop(reason);
})().catch(() => {
  process.exitCode = 0;
});
