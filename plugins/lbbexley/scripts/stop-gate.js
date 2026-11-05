#!/usr/bin/env node
'use strict';
// End-of-run gate. Runs when the assistant tries to finish a turn.
//
//  0. When the run changed the dev environment (a canvas app, a flow,
//     Dataverse or a Power Pages site), the latest version comes into the
//     repository first: pac solution sync into src/solution, with the canvas
//     app's source in src/canvas/. environment-change.js notes the changes.
//  1. Standards check on every file changed in this run. Any finding, however
//     minor, keeps the assistant working until it's fixed.
//  2. Problems the end-of-run reviewer reported must be fixed: the file has
//     to change before the assistant can finish.
//  3. Files changed since the last review need a review by the smaller model:
//     the lbbexley:end-of-run-reviewer agent (Haiku) in Claude Code, or the
//     lbbexley-check agent in Copilot.
//  4. When everything passes, the assistant commits what the run changed and
//     pushes it to GitHub, so the person never has to. It's asked once for each
//     request from the person, and only after the review, which reads the
//     uncommitted changes. In Copilot, lbbexley-check offers the commit and push
//     as a handover instead.
//
// Deleting a file is a change too: this run's deletions are reviewed and
// committed with the rest. Copilot doesn't tell the gate whether lbbexley-check
// ran, so there the gate asks for the check once per set of changes and then
// says the review isn't confirmed, rather than recording it as done.
//
// Claude Code runs the reviewer in the background, so the assistant's turn can
// end while the review is still going. The gate waits for it rather than
// asking again: the review's report starts a turn of its own, and the gate runs
// again at the end of that turn.
//
// Plan mode is left alone. Limits stop it going round in circles, and in each
// case the person is told what's outstanding:
//   - a sync that still hasn't happened after three requests
//   - standards problems that are still there after three attempts
//   - reviewer problems the assistant has explained rather than fixed. These
//     are then the person's to decide, so they aren't raised again unless a
//     later review reports them again, and the work can still be committed.
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
const { changedFiles, deletedFiles, hasRemote, workingDiff } = require('./lib/git');
const { stateDir, load, save, hashFile, unreviewed } = require('./lib/state');

const MAX_SAME_HOLDS = 3;
const MAX_REVIEW_ROUNDS = Math.max(1, Number(process.env.LBBEXLEY_REVIEW_ROUNDS) || 5);
// A review that started but never reported is given up on after this long.
const REVIEW_TIMEOUT_MS = 15 * 60 * 1000;
const REVIEWER = /end-of-run-reviewer/i;
const FINISHED = /^(completed|done|failed|error|killed|cancelled|canceled|stopped)$/i;
// Never offered for committing, even where a repository's .gitignore misses them:
// harness state, cleaned discovery material, secrets, saved sign-ins, and
// original transcripts with the roles files that hold the names.
const NEVER_COMMIT = /^(\.lbbexley\/state|docs\/discovery|\.auth)\/|(^|\/)\.env(\.[^/]*)?$|\.(pfx|vtt)$|\.roles\.json$/i;

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

const listed = (files, deleted) => files.map(f => `- ${f}${deleted.has(f) ? ' (deleted)' : ''}`);

function writeReviewRequest(root, files, deleted, sessionId) {
  const diff = workingDiff(root, files);
  const text = [
    '# End-of-run review request',
    '',
    `Session ${sessionId}. Review only these files, which changed in this run:`,
    '',
    ...listed(files, deleted),
    '',
    'New files appear in full when you read them. A deleted file appears in the diff: check the deletion was meant, and that it doesn\'t remove a test, a requirement or a check without a written reason. Changes to tracked files:',
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
  const uncommitted = changedFiles(root) || [];
  const fromGit = uncommitted.filter(rel => {
    try {
      return fs.statSync(path.join(root, rel)).mtimeMs >= startedAt - 2000;
    } catch {
      return false;
    }
  });
  const runFiles = [...new Set([...state.edited, ...fromGit])].filter(usable).sort();
  // Files this run deleted: deletions not yet committed that weren't there when
  // the session started.
  const deletedAtStart = new Set(state.deletedAtStart || []);
  const deletedNow = (deletedFiles(root) || []).filter(rel => !deletedAtStart.has(rel));
  const deleted = new Set(deletedNow);
  const deletedToReview = deletedNow.filter(rel => isCheckable(rel) && !isIgnoredPath(rel, cfg));

  // 0. The latest version from the dev environment, before anything is checked.
  const env = state.environment || {};
  const outside = (env.canvasFolders || []).filter(dir => !/^src\/canvas\//.test(dir));
  if (env.pending || outside.length) {
    const what = (env.changes || []).length ? env.changes.join(', ') : 'the canvas app';
    env.syncAsks = (env.syncAsks || 0) + 1;
    if (env.syncAsks > MAX_SAME_HOLDS) {
      state.environment = { ...env, pending: false, changes: [], canvasFolders: [], syncAsks: 0 };
      save(root, input.sessionId, state);
      allowStop(`Bexley end-of-run check: this run changed ${what} in the dev environment, but the latest version hasn't come into the repository, so it isn't reviewed, committed or pushed yet. Ask the assistant to sync the solution into src/solution once pac is connected to the dev environment.`);
      return;
    }
    const lines = [`Before finishing, bring the latest version from the dev environment into the repository: this run changed ${what} there.`];
    if (env.pending) {
      lines.push('- Run pac solution sync in src/solution. If there\'s no src/solution yet, clone the solution named in AGENTS.md into it first with pac solution clone.');
    }
    if (outside.length) {
      lines.push(`- The canvas app was compiled from ${outside.join(', ')}. Move its .pa.yaml files into src/canvas/<app name>/, so the repository has them, and use that folder with Microsoft's canvas tools from now on.`);
      env.canvasFolders = (env.canvasFolders || []).filter(dir => /^src\/canvas\//.test(dir));
    }
    lines.push('Don\'t edit the synced files by hand: to change something, change it in the dev environment and sync again. Then the check, the review and the commit follow.');
    state.environment = env;
    save(root, input.sessionId, state);
    blockStop(lines.join('\n'));
    return;
  }

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
  // files (.lbbexley/, such as the improvement ideas the review itself logs) and
  // the person's discovery material (docs/discovery/, never committed) get the
  // standards check above but not a review.
  const reviewOn = (process.env.LBBEXLEY_END_OF_RUN || process.env.EVAL_LBBEXLEY_END_OF_RUN) !== '0';
  const toReview = [...runFiles, ...deletedToReview].filter(rel => !rel.startsWith('.lbbexley/') && !rel.startsWith('docs/discovery/')).sort();
  // In Copilot, files already handed to lbbexley-check in their current form
  // aren't asked about again, though the review isn't recorded as done.
  const askedOnly = state.askedOnly || {};
  const unseen = reviewOn ? unreviewed(root, state, toReview).filter(rel => !(copilot && askedOnly[rel] === hashFile(root, rel))) : [];
  const capped = unseen.length > 0 && (state.reviewRounds || 0) >= MAX_REVIEW_ROUNDS;
  const needReview = capped ? [] : unseen;

  if (!problems.length && !stillOpen.length && !needReview.length) {
    state.holds = 0;
    state.lastFingerprint = '';

    // 4. Save the work: what this run changed and hasn't been committed.
    const edited = new Set(state.edited);
    const toCommit = [...new Set([...uncommitted.filter(rel => edited.has(rel) || fromGit.includes(rel)), ...deletedNow])]
      .filter(rel => !NEVER_COMMIT.test(rel.replace(/\\/g, '/')))
      .sort();
    const askedFor = personAt === undefined ? `session ${startedAt}` : personAt;
    if (reviewOn && !copilot && !capped && toCommit.length && state.commitAskedFor !== askedFor) {
      state.commitAskedFor = askedFor;
      save(root, input.sessionId, state);
      const saveIt = hasRemote(root)
        ? `commit the ${toCommit.length} file(s) this run changed, on the current branch, with a short message saying what changed, then push it to GitHub with git push, and tell the person it's committed and pushed. If the push fails, tell them why. Don't make a branch or open a pull request unless they asked:`
        : `commit the ${toCommit.length} file(s) this run changed, on the current branch, with a short message saying what changed, and tell the person it's committed. There's no remote to push it to. Don't make a branch or open a pull request unless they asked:`;
      blockStop([
        `Bexley end-of-run check passed. Now save the work, as AGENTS.md says: ${saveIt}`,
        ...listed(toCommit, deleted),
      ].join('\n'));
      return;
    }

    const summary = state.lastReview && !state.lastReview.announced && state.lastReview.readable !== false ? state.lastReview : null;
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

  // Copilot can't confirm the review ran, so it's asked once per set of changes,
  // and then the person is told the review isn't confirmed. Nothing is marked as
  // reviewed: only a reviewer's report does that.
  if (!problems.length && !stillOpen.length && copilot && state.reviewRequested === fp) {
    state.askedOnly = askedOnly;
    for (const rel of needReview) state.askedOnly[rel] = hashFile(root, rel);
    save(root, input.sessionId, state);
    allowStop(`Bexley end-of-run check: the review of ${needReview.length} changed file(s) isn't confirmed, because Copilot doesn't tell the check whether lbbexley-check ran. If you haven't yet, select Check my work, and commit only when it finds nothing outstanding.`);
    return;
  }

  const limit = problems.length || !stillOpen.length ? MAX_SAME_HOLDS : 1;
  if (state.holds > limit) {
    state.holds = 0;
    if (!problems.length && stillOpen.length) {
      // The person decides about these now. Don't hold the work back for them
      // again: a later review that still finds them reports them again.
      state.openItems = (state.openItems || []).filter(item => !stillOpen.includes(item));
      if (state.lastReview) state.lastReview.announced = true;
    }
    save(root, input.sessionId, state);
    const item = i => `- ${i.file}${i.line ? ` line ${i.line}` : ''}: ${i.problem}`;
    if (problems.length) {
      allowStop(`Bexley checks: stopped with ${problems.length} standards problem(s) still outstanding. They must be fixed before this work is done:\n${problems.join('\n')}`);
    } else if (stillOpen.length) {
      allowStop(`Bexley checks: the end-of-run review reported ${stillOpen.length} problem(s) that weren't fixed. Read the explanation above and decide whether they need fixing before this work is done:\n${stillOpen.map(item).join('\n')}\nIf they don't, say so, and the assistant commits the work. If they do, ask for the fix.`);
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
      ...(problems.some(p => p.startsWith('- src/solution/')) ? ['Problems in src/solution came from the dev environment: fix them there, then sync again, rather than editing the synced files.'] : []),
      ...(problems.some(p => p.startsWith('- src/canvas/')) ? ['For the canvas app, fix its .pa.yaml in src/canvas/ and compile it into the app with Microsoft\'s canvas tools, so the app and the repository match.'] : []),
    ].join('\n');
  } else if (stillOpen.length) {
    reason = [
      'Not finished: the end-of-run review reported problems that haven\'t been fixed yet:',
      ...stillOpen.map(i => `- ${i.file}${i.line ? ` line ${i.line}` : ''}: ${i.problem}${i.fix ? ` Fix: ${i.fix}` : ''}`),
      "Fix them. If you're sure one is wrong, explain why to the person instead of changing the file.",
    ].join('\n');
  } else {
    writeReviewRequest(root, needReview, deleted, input.sessionId);
    state.pendingReview = { fp, files: needReviewHashes };
    state.reviewRequested = fp;
    state.reviewRounds = (state.reviewRounds || 0) + 1;
    const who = copilot
      ? 'hand this run\'s changes to the lbbexley-check agent (it runs on a smaller model)'
      : 'run the lbbexley:end-of-run-reviewer agent (it runs on Haiku, a smaller model) on this run\'s changes';
    reason = [
      `End-of-run check: before finishing, ${who}. It reads .lbbexley/state/review-request.md, which lists the ${needReview.length} file(s) changed:`,
      ...listed(needReview, deleted),
      ...(copilot ? [] : ['Start it once. If it runs in the background, end your turn: its report comes back to you when it finishes.']),
      'Fix every problem it reports, however minor, then finish. Its ideas for improving the harness are logged automatically.',
    ].join('\n');
  }
  save(root, input.sessionId, state);
  blockStop(reason);
})().catch(() => {
  process.exitCode = 0;
});
