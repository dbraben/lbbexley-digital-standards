'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { SCRIPTS, tempRepo, bexleyRepo, run, nhsNumber, spaced, personalEmail } = require('./helpers');

const hook = name => path.join(SCRIPTS, name);
const BAD_CANVAS = 'Screens:\n  S:\n    Properties:\n      Fill: =Color.Red\n';
const GOOD_CANVAS = 'Screens:\n  S:\n    Properties:\n      Fill: =BexleyWhite\n';
const COPILOT = { LBBEXLEY_HARNESS: 'copilot' };

function gitRepo(files) {
  const dir = bexleyRepo(files);
  const git = args => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  git(['init', '-q']);
  git(['add', '-A']);
  git(['-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-qm', 'start']);
  return dir;
}

const state = (dir, session = 's1') => JSON.parse(fs.readFileSync(path.join(dir, '.lbbexley', 'state', `${session}.json`), 'utf8'));
const write = (dir, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};
const saved = (dir, rel, env = {}) => run(hook('check-file.js'), [], { input: { cwd: dir, session_id: 's1', tool_name: 'Write', tool_input: { file_path: path.join(dir, rel) } }, env });
const stop = (dir, extra = {}, env = {}) => run(hook('stop-gate.js'), [], { input: { cwd: dir, session_id: 's1', hook_event_name: 'Stop', ...extra }, env });
const reviewerDone = (dir, message, agent = 'lbbexley:end-of-run-reviewer') => run(hook('end-of-run-record.js'), [], { input: { cwd: dir, session_id: 's1', hook_event_name: 'SubagentStop', agent_type: agent, last_assistant_message: message } });
const reviewerStarted = (dir, agent = 'lbbexley:end-of-run-reviewer') => run(hook('end-of-run-record.js'), [], { input: { cwd: dir, session_id: 's1', hook_event_name: 'SubagentStart', agent_type: agent } });
const promptSent = (dir, source) => run(hook('prompt-guard.js'), [], { input: { cwd: dir, session_id: 's1', hook_event_name: 'UserPromptSubmit', prompt: 'Carry on', ...(source ? { source } : {}) } });
const sessionStarted = dir => run(hook('session-start.js'), [], { input: { cwd: dir, session_id: 's1' } });
const runningReviewer = [{ id: 'a1', type: 'subagent', status: 'running', description: 'End-of-run check', agent_type: 'lbbexley:end-of-run-reviewer' }];
const report = obj => `END-OF-RUN REVIEW: done\n\n\`\`\`json\n${JSON.stringify(obj)}\n\`\`\``;
// Does what the assistant does when the stop gate asks it to save the work:
// commits the files the request lists.
const commitListed = (dir, reason) => {
  const files = reason.split('\n').filter(line => line.startsWith('- ')).map(line => line.slice(2).replace(/ \(deleted\)$/, ''));
  spawnSync('git', ['add', '--', ...files], { cwd: dir });
  spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-qm', 'Save the work'], { cwd: dir });
  return files;
};

// ---------- prompt guard ----------

test('prompt guard blocks real-looking personal data and masks it', () => {
  const dir = bexleyRepo();
  const nhs = spaced(nhsNumber('401023213'));
  const res = run(hook('prompt-guard.js'), [], { input: { cwd: dir, prompt: `Add a test patient with NHS number ${nhs}` } });
  const out = JSON.parse(res.stdout);
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /NHS number/);
  assert.ok(!out.reason.includes(nhs), 'the full number is not echoed back');
});

test('prompt guard lets [fictional] prompts, safe formats and other projects through', () => {
  const dir = bexleyRepo();
  const nhs = spaced(nhsNumber('401023213'));
  assert.equal(run(hook('prompt-guard.js'), [], { input: { cwd: dir, prompt: `[fictional] NHS ${nhs}` } }).stdout, '');
  assert.equal(run(hook('prompt-guard.js'), [], { input: { cwd: dir, prompt: 'Use QQ 12 34 56 C and sam@example.com' } }).stdout, '');
  assert.equal(run(hook('prompt-guard.js'), [], { input: { cwd: tempRepo({ 'README.md': 'x' }), prompt: `NHS ${nhs}` } }).stdout, '');
});

// ---------- Dataverse guard ----------

test('Dataverse guard: in the dev environment, reads and writes go ahead and deletes are denied', () => {
  const decide = (tool, env) => {
    const res = run(hook('dataverse-guard.js'), [], { input: { tool_name: tool, tool_input: {} }, env });
    if (!res.stdout) return 'none';
    const out = JSON.parse(res.stdout);
    return (out.hookSpecificOutput || out).permissionDecision;
  };
  assert.equal(decide('mcp__dataverse__list_tables'), 'none');
  assert.equal(decide('mcp__dataverse__describe_table'), 'none');
  assert.equal(decide('mcp__dataverse__read_query'), 'none');
  assert.equal(decide('mcp__dataverse__create_record'), 'none');
  assert.equal(decide('mcp__dataverse__create_table'), 'none');
  assert.equal(decide('mcp__dataverse__delete_record'), 'deny');
  assert.equal(decide('dataverse/delete_table', COPILOT), 'deny', 'Copilot tool names and output shape');
  assert.equal(decide('edit', COPILOT), 'none', 'Copilot: other tools are left alone');
});

// ---------- after each edit ----------

test('file check: every finding, even a warning, goes back to Claude to fix (exit 2)', () => {
  const dir = bexleyRepo({ 'src/Home.pa.yaml': BAD_CANVAS, 'src/site.css': 'body { font-family: Arial; }\n' });
  const err = saved(dir, 'src/Home.pa.yaml');
  assert.equal(err.code, 2);
  assert.match(err.stderr, /src\/Home\.pa\.yaml line 4: Hard-coded colour Color\.Red/);
  const warn = saved(dir, 'src/site.css');
  assert.equal(warn.code, 2, 'warnings are fixed too');
  assert.match(warn.stderr, /css-font/);
  write(dir, 'src/site.css', 'body { font-family: var(--bexley-font); }\n');
  const clean = saved(dir, 'src/site.css');
  assert.equal(clean.code, 0);
  assert.match(JSON.parse(clean.stdout).hookSpecificOutput.additionalContext, /passed for src\/site\.css/, 'a clean save says so');
  assert.deepEqual(state(dir).edited.sort(), ['src/Home.pa.yaml', 'src/site.css']);
});

test('file check: Copilot gets the findings as context, from its own input shape', () => {
  const dir = bexleyRepo({ 'src/Home.pa.yaml': BAD_CANVAS });
  const res = run(hook('check-file.js'), [], { input: { cwd: dir, sessionId: 's1', toolName: 'edit', toolArgs: JSON.stringify({ path: 'src/Home.pa.yaml' }) }, env: COPILOT });
  assert.equal(res.code, 0);
  assert.match(JSON.parse(res.stdout).additionalContext, /canvas-hardcoded-colour/);
});

test('deletions are found whether or not they are staged', () => {
  const { deletedFiles } = require('../plugins/lbbexley/scripts/lib/git');
  const dir = gitRepo({ 'docs/a.md': 'a\n', 'docs/b.md': 'b\n', 'docs/c.md': 'c\n', 'docs/d.md': 'd\n' });
  fs.rmSync(path.join(dir, 'docs/a.md'));
  spawnSync('git', ['rm', '-q', 'docs/b.md'], { cwd: dir });
  write(dir, 'docs/c.md', 'changed\n');
  spawnSync('git', ['add', 'docs/c.md'], { cwd: dir });
  fs.rmSync(path.join(dir, 'docs/c.md'));
  write(dir, 'docs/new.md', 'new\n');
  spawnSync('git', ['add', 'docs/new.md'], { cwd: dir });
  fs.rmSync(path.join(dir, 'docs/new.md'));
  assert.deepEqual(deletedFiles(dir).sort(), ['docs/a.md', 'docs/b.md', 'docs/c.md'], 'a file that was never committed is not a deletion');
});

test('Copilot hooks answer in both the Copilot CLI shape and the hookSpecificOutput shape VS Code documents', () => {
  const dir = gitRepo({ 'src/Home.pa.yaml': GOOD_CANVAS });
  const copilot = (script, input) => JSON.parse(run(hook(script), [], { input: { cwd: dir, sessionId: 's1', ...input }, env: COPILOT }).stdout);

  const start = copilot('session-start.js', {});
  assert.equal(start.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.equal(start.hookSpecificOutput.additionalContext, start.additionalContext);

  const denied = copilot('dataverse-guard.js', { toolName: 'dataverse/delete_record', toolArgs: '{}' });
  assert.equal(denied.permissionDecision, 'deny');
  assert.deepEqual(denied.hookSpecificOutput, { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: denied.permissionDecisionReason });

  write(dir, 'src/Home.pa.yaml', BAD_CANVAS);
  const after = copilot('check-file.js', { toolName: 'edit', toolArgs: JSON.stringify({ path: 'src/Home.pa.yaml' }) });
  assert.equal(after.hookSpecificOutput.hookEventName, 'PostToolUse');
  assert.equal(after.hookSpecificOutput.additionalContext, after.additionalContext);

  const held = copilot('stop-gate.js', { hookEventName: 'agentStop' });
  assert.equal(held.decision, 'block');
  assert.deepEqual(held.hookSpecificOutput, { hookEventName: 'Stop', decision: 'block', reason: held.reason });
});

test('file check: respects .lbbexleyignore, synced files and non-Bexley projects', () => {
  const dir = bexleyRepo({ 'legacy/Old.pa.yaml': BAD_CANVAS, '.github/skills/lbbexley-x/a.pa.yaml': BAD_CANVAS, '.lbbexleyignore': 'legacy/**  # replaced by the new app\n' });
  assert.equal(saved(dir, 'legacy/Old.pa.yaml').code, 0);
  assert.equal(saved(dir, '.github/skills/lbbexley-x/a.pa.yaml').code, 0);
  const other = tempRepo({ 'Home.pa.yaml': BAD_CANVAS });
  assert.equal(run(hook('check-file.js'), [], { input: { cwd: other, tool_input: { file_path: path.join(other, 'Home.pa.yaml') } } }).code, 0);
});

test('LBBEXLEY_ALWAYS and EVAL_LBBEXLEY_ALWAYS switch the guardrails on anywhere', () => {
  const other = tempRepo({ 'Home.pa.yaml': BAD_CANVAS });
  const input = { cwd: other, tool_input: { file_path: path.join(other, 'Home.pa.yaml') } };
  assert.equal(run(hook('check-file.js'), [], { input, env: { LBBEXLEY_ALWAYS: '1' } }).code, 2);
  assert.equal(run(hook('check-file.js'), [], { input, env: { EVAL_LBBEXLEY_ALWAYS: '1' } }).code, 2);
});

// ---------- end of run ----------

test('stop gate: holds Claude back until every finding in this run is fixed', () => {
  const dir = gitRepo({ 'src/Home.pa.yaml': GOOD_CANVAS });
  write(dir, 'src/Home.pa.yaml', BAD_CANVAS);
  saved(dir, 'src/Home.pa.yaml');
  const held = JSON.parse(stop(dir).stdout);
  assert.equal(held.decision, 'block');
  assert.match(held.reason, /standards check found 1 problem/);
  assert.equal(stop(dir, { permission_mode: 'plan' }).stdout, '', 'plan mode is left alone');
});

test('stop gate and end-of-run reviewer: review, problems held open, ideas logged', () => {
  const dir = gitRepo({ 'src/Home.pa.yaml': GOOD_CANVAS, '.lbbexley/improvements.md': '# Harness improvement ideas\n' });
  write(dir, 'src/Home.pa.yaml', GOOD_CANVAS.replace('BexleyWhite', 'BexleyHighlight'));
  saved(dir, 'src/Home.pa.yaml');

  const ask = JSON.parse(stop(dir).stdout);
  assert.equal(ask.decision, 'block');
  assert.match(ask.reason, /lbbexley:end-of-run-reviewer/);
  assert.match(fs.readFileSync(path.join(dir, '.lbbexley', 'state', 'review-request.md'), 'utf8'), /src\/Home\.pa\.yaml/);

  reviewerDone(dir, report({
    work: [{ file: 'src/Home.pa.yaml', line: 4, problem: 'The screen has no heading', fix: 'Add a Heading1 label' }],
    harness: [{ area: 'check', target: 'canvas-apps', suggestion: 'Flag screens with no controls at all', evidence: 'Home.pa.yaml had none' }],
  }));
  assert.match(fs.readFileSync(path.join(dir, '.lbbexley', 'improvements.md'), 'utf8'), /- \[ \] \d{4}-\d\d-\d\d · check: canvas-apps · Flag screens with no controls at all/);

  const open = JSON.parse(stop(dir).stdout);
  assert.match(open.reason, /haven't been fixed yet[\s\S]*The screen has no heading/);

  write(dir, 'src/Home.pa.yaml', GOOD_CANVAS.replace('BexleyWhite', 'BexleyPanel'));
  saved(dir, 'src/Home.pa.yaml');
  assert.match(JSON.parse(stop(dir).stdout).reason, /end-of-run-reviewer/, 'the fix is reviewed again');
  reviewerDone(dir, report({ work: [], harness: [{ area: 'check', target: 'canvas-apps', suggestion: 'Flag screens with no controls at all', evidence: 'again' }] }));

  const saveIt = JSON.parse(stop(dir).stdout);
  assert.equal(saveIt.decision, 'block', 'once everything passes, the work is committed');
  assert.match(saveIt.reason, /check passed\. Now save the work, as AGENTS\.md says: commit the 2 file\(s\)[^\n]*\n- \.lbbexley\/improvements\.md\n- src\/Home\.pa\.yaml$/);
  commitListed(dir, saveIt.reason);

  const done = JSON.parse(stop(dir, { stop_hook_active: true }).stdout || '{}');
  assert.match(done.systemMessage, /end-of-run check passed/);
  assert.equal(stop(dir).stdout, '', 'nothing more to say');
  const ideas = fs.readFileSync(path.join(dir, '.lbbexley', 'improvements.md'), 'utf8').match(/- \[ \]/g);
  assert.equal(ideas.length, 1, 'duplicate ideas are not logged twice');
});

test('an unreadable reviewer report is never a pass, and keeps earlier findings open', () => {
  const dir = gitRepo({ 'src/Home.pa.yaml': GOOD_CANVAS });
  write(dir, 'src/Home.pa.yaml', GOOD_CANVAS.replace('BexleyWhite', 'BexleyPanel'));
  saved(dir, 'src/Home.pa.yaml');
  stop(dir);
  reviewerDone(dir, 'I could not complete the review: the file was too large to read.');
  assert.equal(state(dir).lastReview.readable, false);
  assert.deepEqual(state(dir).reviewed, {}, 'nothing is marked reviewed');

  const again = JSON.parse(stop(dir, { stop_hook_active: true }).stdout);
  assert.equal(again.decision, 'block', 'the review is asked for again');
  assert.match(again.reason, /end-of-run-reviewer/);
  assert.doesNotMatch(JSON.stringify(again), /check passed/);

  reviewerDone(dir, report({ work: [{ file: 'src/Home.pa.yaml', line: 4, problem: 'Panel is too pale', fix: 'Use white' }], harness: [] }));
  assert.equal(state(dir).lastReview.readable, true);
  const held = JSON.parse(stop(dir, { stop_hook_active: true }).stdout);
  assert.equal(held.decision, 'block', 'the earlier finding is still open');
  assert.match(held.reason, /Panel is too pale/);
});

test('a file created through a terminal command is reviewed once, not again after a clean review', () => {
  const dir = gitRepo({ 'src/Home.pa.yaml': GOOD_CANVAS });
  write(dir, 'src/Shell.pa.yaml', GOOD_CANVAS);
  const ask = JSON.parse(stop(dir).stdout);
  assert.equal(ask.decision, 'block');
  assert.match(fs.readFileSync(path.join(dir, '.lbbexley', 'state', 'review-request.md'), 'utf8'), /src\/Shell\.pa\.yaml/);

  reviewerDone(dir, report({ work: [], harness: [] }));
  const after = JSON.parse(stop(dir).stdout);
  assert.doesNotMatch(after.reason, /end-of-run-reviewer/, 'no second review request for the same content');
  assert.match(after.reason, /Now save the work, as AGENTS\.md says: commit the 1 file\(s\)[^\n]*\n- src\/Shell\.pa\.yaml$/, 'it is committed instead');
});

test('end-of-run record ignores other agents and never logs personal data', () => {
  const dir = gitRepo({ 'src/Home.pa.yaml': GOOD_CANVAS });
  reviewerDone(dir, report({ work: [], harness: [{ area: 'skill', suggestion: `Mention ${personalEmail()}`, evidence: 'x' }] }), 'Explore');
  assert.ok(!fs.existsSync(path.join(dir, '.lbbexley', 'improvements.md')));
  reviewerDone(dir, report({ work: [], harness: [{ area: 'skill', suggestion: `Mention ${personalEmail()} in the docs`, evidence: 'x' }] }));
  assert.ok(!fs.existsSync(path.join(dir, '.lbbexley', 'improvements.md')), 'an idea with personal data is dropped');
});

test('stop gate: gives up after three identical holds and tells the person', () => {
  const dir = gitRepo({ 'src/Home.pa.yaml': GOOD_CANVAS });
  write(dir, 'src/Home.pa.yaml', BAD_CANVAS);
  saved(dir, 'src/Home.pa.yaml');
  for (let i = 0; i < 3; i++) assert.equal(JSON.parse(stop(dir).stdout).decision, 'block');
  const gaveUp = JSON.parse(stop(dir).stdout);
  assert.equal(gaveUp.decision, undefined);
  assert.match(gaveUp.systemMessage, /stopped with 1 standards problem\(s\) still outstanding/);
});

test('stop gate: a reviewer problem explained rather than fixed is passed to the person', () => {
  const dir = gitRepo({ 'src/Home.pa.yaml': GOOD_CANVAS });
  write(dir, 'src/Home.pa.yaml', GOOD_CANVAS.replace('BexleyWhite', 'BexleyPanel'));
  saved(dir, 'src/Home.pa.yaml');
  stop(dir);
  reviewerDone(dir, report({ work: [{ file: 'src/Home.pa.yaml', line: 4, problem: 'Panel is too pale', fix: 'Use white' }], harness: [] }));
  assert.equal(JSON.parse(stop(dir, { stop_hook_active: true }).stdout).decision, 'block');
  const passed = JSON.parse(stop(dir, { stop_hook_active: true }).stdout);
  assert.equal(passed.decision, undefined);
  assert.match(passed.systemMessage, /weren't fixed[\s\S]*Panel is too pale[\s\S]*If they don't, say so, and the assistant commits the work/);

  // It's the person's call now: the problem isn't held against the work again,
  // and the work can be committed.
  promptSent(dir, 'user');
  const next = JSON.parse(stop(dir).stdout);
  assert.doesNotMatch(next.reason, /Panel is too pale/);
  assert.match(next.reason, /Now save the work[\s\S]*- src\/Home\.pa\.yaml$/);
});

test('stop gate: discovery material gets the standards check but no review', () => {
  const dir = gitRepo({ 'src/Home.pa.yaml': GOOD_CANVAS });
  write(dir, 'docs/discovery/service-introduction.md', '# Service introduction\n\nStaff book meeting rooms.\n');
  saved(dir, 'docs/discovery/service-introduction.md');
  assert.equal(stop(dir).stdout, '', 'no review, and nothing to commit');
  write(dir, 'docs/discovery/service-introduction.md', `# Service introduction\n\nRing ${personalEmail()} to book.\n`);
  saved(dir, 'docs/discovery/service-introduction.md');
  assert.match(JSON.parse(stop(dir).stdout).reason, /standards check found 1 problem/, 'personal data is still caught');
});

test('stop gate: without a record of the person\'s messages, a limited number of reviews in one turn, then the rest waits for the next turn', () => {
  const dir = gitRepo({ 'src/Home.pa.yaml': GOOD_CANVAS });
  const three = { LBBEXLEY_REVIEW_ROUNDS: '3' };
  const colours = ['BexleyPanel', 'BexleyHighlight', 'BexleyWhite', 'BexleyPanel'];
  for (let round = 0; round < 3; round++) {
    write(dir, 'src/Home.pa.yaml', GOOD_CANVAS.replace('BexleyWhite', colours[round]));
    saved(dir, 'src/Home.pa.yaml');
    assert.match(JSON.parse(stop(dir, { stop_hook_active: round > 0 }, three).stdout).reason, /end-of-run-reviewer/, `round ${round + 1}`);
    reviewerDone(dir, report({ work: [], harness: [] }));
  }
  write(dir, 'src/Home.pa.yaml', GOOD_CANVAS.replace('BexleyWhite', colours[3]));
  saved(dir, 'src/Home.pa.yaml');
  const capped = JSON.parse(stop(dir, { stop_hook_active: true }, three).stdout);
  assert.equal(capped.decision, undefined);
  assert.match(capped.systemMessage, /3 times for this request[\s\S]*src\/Home\.pa\.yaml/);
  assert.match(JSON.parse(stop(dir, { stop_hook_active: false }, three).stdout).reason, /end-of-run-reviewer/, 'a new turn reviews what was left');
});

test('stop gate: files changed by a command are reviewed once, not asked about again and again', () => {
  const dir = gitRepo({ 'src/Home.pa.yaml': GOOD_CANVAS, 'docs/notes.md': '# Notes\n\nThe first version.\n' });
  sessionStarted(dir);
  write(dir, 'src/Home.pa.yaml', GOOD_CANVAS.replace('BexleyWhite', 'BexleyPanel'));
  saved(dir, 'src/Home.pa.yaml');
  write(dir, 'docs/notes.md', '# Notes\n\nThe second version, changed by a command rather than an edit tool.\n');

  const ask = JSON.parse(stop(dir).stdout);
  assert.match(ask.reason, /2 file\(s\) changed:\n- docs\/notes\.md\n- src\/Home\.pa\.yaml/);
  reviewerDone(dir, report({ work: [], harness: [] }));

  const saveIt = JSON.parse(stop(dir, { stop_hook_active: true }).stdout);
  assert.match(saveIt.reason, /commit the 2 file\(s\)[^\n]*\n- docs\/notes\.md\n- src\/Home\.pa\.yaml$/, 'the review covered both files, and both are committed');
  commitListed(dir, saveIt.reason);
  const done = JSON.parse(stop(dir, { stop_hook_active: true }).stdout || '{}');
  assert.equal(done.decision, undefined);
  assert.match(done.systemMessage, /end-of-run check passed/);
});

test('stop gate: waits for a review that is running in the background instead of asking again', () => {
  const dir = gitRepo({ 'src/Home.pa.yaml': GOOD_CANVAS });
  write(dir, 'src/Home.pa.yaml', GOOD_CANVAS.replace('BexleyWhite', 'BexleyPanel'));
  saved(dir, 'src/Home.pa.yaml');
  const ask = JSON.parse(stop(dir).stdout);
  assert.match(ask.reason, /end-of-run-reviewer/);
  assert.match(ask.reason, /in the background, end your turn/);

  for (let i = 0; i < 5; i++) {
    const waiting = JSON.parse(stop(dir, { stop_hook_active: true, background_tasks: runningReviewer }).stdout);
    assert.equal(waiting.decision, undefined, `wait ${i + 1}: Claude isn't sent back to start another review`);
    assert.match(waiting.systemMessage, /still running/);
  }
  const other = [{ id: 'a2', type: 'subagent', status: 'running', description: 'Explore', agent_type: 'Explore' }];
  assert.equal(JSON.parse(stop(dir, { stop_hook_active: true, background_tasks: other }).stdout).decision, 'block', 'another agent is not the review');

  reviewerDone(dir, report({ work: [{ file: 'src/Home.pa.yaml', line: 4, problem: 'Panel is too pale', fix: 'Use white' }], harness: [] }));
  const fix = JSON.parse(stop(dir, { background_tasks: [] }).stdout);
  assert.match(fix.reason, /Panel is too pale/, 'its report is acted on in the next turn');
  write(dir, 'src/Home.pa.yaml', GOOD_CANVAS);
  saved(dir, 'src/Home.pa.yaml');
  assert.match(JSON.parse(stop(dir, { stop_hook_active: true, background_tasks: [] }).stdout).reason, /end-of-run-reviewer/);
  reviewerDone(dir, report({ work: [], harness: [] }));
  // The fix put the file back as it was committed, so there's nothing to save.
  assert.match(JSON.parse(stop(dir, { background_tasks: [] }).stdout).systemMessage, /end-of-run check passed/);
});

test('stop gate: without a list of background tasks, a review that started and has not finished is waited for', () => {
  const dir = gitRepo({ 'src/Home.pa.yaml': GOOD_CANVAS });
  write(dir, 'src/Home.pa.yaml', GOOD_CANVAS.replace('BexleyWhite', 'BexleyPanel'));
  saved(dir, 'src/Home.pa.yaml');
  stop(dir);
  reviewerStarted(dir, 'Explore');
  assert.equal(JSON.parse(stop(dir, { stop_hook_active: true }).stdout).decision, 'block', 'another agent is not the review');
  reviewerStarted(dir);
  assert.match(JSON.parse(stop(dir, { stop_hook_active: true }).stdout).systemMessage, /still running/);

  const file = path.join(dir, '.lbbexley', 'state', 's1.json');
  const s = state(dir);
  s.reviewStartedAt = Date.now() - 31 * 60 * 1000;
  fs.writeFileSync(file, JSON.stringify(s));
  assert.equal(JSON.parse(stop(dir, { stop_hook_active: true }).stdout).decision, 'block', 'a review that never reported is asked for again');

  reviewerStarted(dir);
  reviewerDone(dir, report({ work: [], harness: [] }));
  const saveIt = JSON.parse(stop(dir, { stop_hook_active: true }).stdout);
  assert.match(saveIt.reason, /check passed\. Now save the work/);
  commitListed(dir, saveIt.reason);
  assert.match(JSON.parse(stop(dir, { stop_hook_active: true }).stdout).systemMessage, /end-of-run check passed/);
});

test('stop gate: once everything passes, asks once for each request for the work to be committed', () => {
  const dir = gitRepo({ 'src/Home.pa.yaml': GOOD_CANVAS });
  promptSent(dir, 'user');
  write(dir, 'src/Home.pa.yaml', GOOD_CANVAS.replace('BexleyWhite', 'BexleyPanel'));
  saved(dir, 'src/Home.pa.yaml');
  write(dir, 'Team meeting.vtt', 'WEBVTT\n');
  assert.match(JSON.parse(stop(dir).stdout).reason, /end-of-run-reviewer/, 'the review comes first');
  reviewerDone(dir, report({ work: [], harness: [] }));

  const saveIt = JSON.parse(stop(dir).stdout);
  assert.equal(saveIt.decision, 'block');
  assert.match(saveIt.reason, /^Bexley end-of-run check passed\. Now save the work, as AGENTS\.md says: commit the 1 file\(s\) this run changed, on the current branch, with a short message/);
  assert.match(saveIt.reason, /There's no remote to push it to\. Don't make a branch or open a pull request unless they asked:\n- src\/Home\.pa\.yaml$/);
  assert.doesNotMatch(saveIt.reason, /\.vtt|\.lbbexley\/state/, 'transcripts and harness state are never offered');

  // The person had said not to commit: the assistant says so, and isn't asked again for this request.
  const declined = JSON.parse(stop(dir, { stop_hook_active: true }).stdout || '{}');
  assert.equal(declined.decision, undefined);
  assert.match(declined.systemMessage, /end-of-run check passed/);
  assert.equal(stop(dir, { stop_hook_active: true }).stdout, '');

  // Their next request is saved too.
  promptSent(dir, 'user');
  write(dir, 'src/Home.pa.yaml', GOOD_CANVAS.replace('BexleyWhite', 'BexleyHighlight'));
  saved(dir, 'src/Home.pa.yaml');
  assert.equal(stop(dir, { permission_mode: 'plan' }).stdout, '', 'never in plan mode');
  stop(dir);
  reviewerDone(dir, report({ work: [], harness: [] }));
  const again = JSON.parse(stop(dir).stdout);
  assert.match(again.reason, /Now save the work[\s\S]*- src\/Home\.pa\.yaml$/);
  commitListed(dir, again.reason);
  assert.match(JSON.parse(stop(dir, { stop_hook_active: true }).stdout).systemMessage, /end-of-run check passed/);
});

test('stop gate: reviews are counted per request from the person, not per turn', () => {
  const dir = gitRepo({ 'src/Home.pa.yaml': GOOD_CANVAS });
  const two = { LBBEXLEY_REVIEW_ROUNDS: '2' };
  promptSent(dir, 'user');
  const colours = ['BexleyPanel', 'BexleyHighlight', 'BexleyWhite'];
  for (let round = 0; round < 2; round++) {
    write(dir, 'src/Home.pa.yaml', GOOD_CANVAS.replace('BexleyWhite', colours[round]));
    saved(dir, 'src/Home.pa.yaml');
    // A background review's report starts a turn of its own (stop_hook_active is false).
    assert.match(JSON.parse(stop(dir, {}, two).stdout).reason, /end-of-run-reviewer/, `round ${round + 1}`);
    reviewerDone(dir, report({ work: [], harness: [] }));
    promptSent(dir, 'system');
  }
  write(dir, 'src/Home.pa.yaml', GOOD_CANVAS.replace('BexleyWhite', colours[2]));
  saved(dir, 'src/Home.pa.yaml');
  const capped = JSON.parse(stop(dir, {}, two).stdout);
  assert.equal(capped.decision, undefined);
  assert.match(capped.systemMessage, /2 times for this request/);
  promptSent(dir, 'user');
  assert.match(JSON.parse(stop(dir, {}, two).stdout).reason, /end-of-run-reviewer/, 'the next request from the person reviews what was left');
});

test('stop gate in Copilot: asks for the check once per set of changes', () => {
  const dir = gitRepo({ 'src/Home.pa.yaml': GOOD_CANVAS });
  write(dir, 'src/Home.pa.yaml', GOOD_CANVAS.replace('BexleyWhite', 'BexleyPanel'));
  run(hook('check-file.js'), [], { input: { cwd: dir, sessionId: 's1', toolName: 'edit', toolArgs: { path: 'src/Home.pa.yaml' } }, env: COPILOT });
  const first = JSON.parse(run(hook('stop-gate.js'), [], { input: { cwd: dir, sessionId: 's1' }, env: COPILOT }).stdout);
  assert.match(first.reason, /lbbexley-check agent/);
  // Copilot doesn't say whether lbbexley-check ran, so the review isn't recorded as done.
  const second = JSON.parse(run(hook('stop-gate.js'), [], { input: { cwd: dir, sessionId: 's1' }, env: COPILOT }).stdout);
  assert.equal(second.decision, undefined, 'asked once per set of changes');
  assert.match(second.systemMessage, /isn't confirmed[\s\S]*select Check my work/);
  assert.equal(state(dir).reviewed['src/Home.pa.yaml'], undefined, 'not marked as reviewed without a report');
  assert.equal(run(hook('stop-gate.js'), [], { input: { cwd: dir, sessionId: 's1' }, env: COPILOT }).stdout, '', 'said once; lbbexley-check offers the commit, not the gate');

  write(dir, 'src/Home.pa.yaml', GOOD_CANVAS.replace('BexleyWhite', 'BexleyHighlight'));
  run(hook('check-file.js'), [], { input: { cwd: dir, sessionId: 's1', toolName: 'edit', toolArgs: { path: 'src/Home.pa.yaml' } }, env: COPILOT });
  assert.match(JSON.parse(run(hook('stop-gate.js'), [], { input: { cwd: dir, sessionId: 's1' }, env: COPILOT }).stdout).reason, /lbbexley-check agent/, 'a later edit is asked about again');
});

test('stop gate: a file this run deleted is reviewed, and the deletion committed with the rest', () => {
  const dir = gitRepo({ 'src/Home.pa.yaml': GOOD_CANVAS, 'tests/agent-test-set.md': '# Agent test set\n\n- Can I speak to a person?\n' });
  sessionStarted(dir);
  fs.rmSync(path.join(dir, 'tests/agent-test-set.md'));

  const ask = JSON.parse(stop(dir).stdout);
  assert.match(ask.reason, /end-of-run-reviewer[\s\S]*\n- tests\/agent-test-set\.md \(deleted\)\n/);
  const request = fs.readFileSync(path.join(dir, '.lbbexley', 'state', 'review-request.md'), 'utf8');
  assert.match(request, /^- tests\/agent-test-set\.md \(deleted\)$/m);
  assert.match(request, /^-- Can I speak to a person\?$/m, 'the review sees what was deleted');
  reviewerDone(dir, report({ work: [], harness: [] }));

  const saveIt = JSON.parse(stop(dir).stdout);
  assert.match(saveIt.reason, /Now save the work[\s\S]*\n- tests\/agent-test-set\.md \(deleted\)$/);
  commitListed(dir, saveIt.reason);
  const left = spawnSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: dir, encoding: 'utf8' }).stdout.split('\n').filter(l => l.trim());
  assert.deepEqual(left, [], 'the deletion is committed');
  assert.match(JSON.parse(stop(dir, { stop_hook_active: true }).stdout).systemMessage, /end-of-run check passed/);
});

test('stop gate: a deletion made before the session started is left alone', () => {
  const dir = gitRepo({ 'src/Home.pa.yaml': GOOD_CANVAS, 'docs/old-notes.md': '# Old notes\n' });
  fs.rmSync(path.join(dir, 'docs/old-notes.md'));
  sessionStarted(dir);
  assert.equal(stop(dir).stdout, '', 'not reviewed, and not offered for a commit');
});

test('LBBEXLEY_END_OF_RUN=0 keeps the standards gate but skips the review', () => {
  const dir = gitRepo({ 'src/Home.pa.yaml': GOOD_CANVAS });
  write(dir, 'src/Home.pa.yaml', GOOD_CANVAS.replace('BexleyWhite', 'BexleyPanel'));
  saved(dir, 'src/Home.pa.yaml');
  assert.equal(stop(dir, {}, { LBBEXLEY_END_OF_RUN: '0' }).stdout, '');
});

// ---------- session start ----------

test('session start: reminder, unfinished set-up, waiting ideas and pre-election warning', () => {
  const dir = bexleyRepo({
    'AGENTS.md': '# {{SERVICE_NAME}}\n\nBexley standards apply (lbbexley plugin).\n',
    '.lbbexley/improvements.md': '# Ideas\n- [ ] a\n- [ ] b\n- [ ] c\n- [x] d\n',
  });
  const elections = path.join(tempRepo(), 'periods.json');
  fs.writeFileSync(elections, JSON.stringify({ periods: [{ name: 'Test by-election', start: '2027-03-01', end: '2027-03-25' }] }));

  const during = run(hook('session-start.js'), [], { input: { cwd: dir, session_id: 's1' }, env: { LBBEXLEY_ELECTIONS_FILE: elections, LBBEXLEY_TODAY: '2027-03-10' } });
  const text = JSON.parse(during.stdout).hookSpecificOutput.additionalContext;
  assert.match(text, /Bexley standards are active/);
  assert.match(text, /\/lbbexley:new-app/);
  assert.match(text, /3 harness improvement ideas are waiting/);
  assert.match(text, /PRE-ELECTION PERIOD: Test by-election/);
  assert.ok(state(dir).startedAt > 0);

  const after = run(hook('session-start.js'), [], { input: { cwd: dir, session_id: 's2' }, env: { LBBEXLEY_ELECTIONS_FILE: elections, LBBEXLEY_TODAY: '2027-03-26', ...COPILOT } });
  const copilotText = JSON.parse(after.stdout).additionalContext;
  assert.doesNotMatch(copilotText, /PRE-ELECTION/);
  assert.match(copilotText, /lbbexley-new-app skill/);

  assert.equal(run(hook('session-start.js'), [], { input: { cwd: tempRepo() } }).stdout, '');
});

test('hooks fail open on bad input', () => {
  const cwd = bexleyRepo();
  for (const name of ['prompt-guard.js', 'dataverse-guard.js', 'check-file.js', 'session-start.js', 'stop-gate.js', 'end-of-run-record.js']) {
    assert.equal(run(hook(name), [], { input: 'not json', cwd }).code, 0, name);
  }
});

test('the hook tests leave the standards repository untouched', () => {
  assert.ok(!fs.existsSync(path.join(__dirname, '..', '.lbbexley', 'state')));
});

// ---------- building in the dev environment ----------

const afterTool = (dir, input, env = {}) => run(hook('environment-change.js'), [], { input: { cwd: dir, session_id: 's1', ...input }, env });
const decideWith = (script, input, env = {}) => {
  const res = run(hook(script), [], { input, env });
  if (!res.stdout) return { decision: 'none' };
  const out = JSON.parse(res.stdout);
  const o = out.hookSpecificOutput || out;
  return { decision: o.permissionDecision, reason: o.permissionDecisionReason };
};

test('stop gate: a change in the dev environment is synced into the repository before the review', () => {
  const dir = gitRepo({ 'src/canvas/Bookings/Home.pa.yaml': GOOD_CANVAS });
  run(hook('session-start.js'), [], { input: { cwd: dir, session_id: 's1' } });
  write(dir, 'src/canvas/Bookings/Home.pa.yaml', GOOD_CANVAS.replace('BexleyWhite', 'BexleyPanel'));
  saved(dir, 'src/canvas/Bookings/Home.pa.yaml');
  afterTool(dir, { tool_name: 'mcp__plugin_canvas-apps_canvas-authoring__compile_canvas', tool_input: { directory: path.join(dir, 'src/canvas/Bookings') } });
  afterTool(dir, { tool_name: 'mcp__plugin_power-automate_flowagent__update_flow', tool_input: {} });

  const sync = JSON.parse(stop(dir).stdout);
  assert.equal(sync.decision, 'block');
  assert.match(sync.reason, /bring the latest version from the dev environment into the repository: this run changed the canvas app, a flow there/);
  assert.match(sync.reason, /pac solution sync in src\/solution/);
  assert.doesNotMatch(sync.reason, /Move its \.pa\.yaml files/, 'the canvas app was built in src/canvas');

  // A sync that failed doesn't count; one that worked does, and the review follows.
  afterTool(dir, { tool_name: 'Bash', tool_input: { command: 'cd src/solution && pac solution sync' }, tool_response: { stdout: 'Error: not signed in', stderr: '' } });
  assert.match(JSON.parse(stop(dir).stdout).reason, /pac solution sync/);
  afterTool(dir, { tool_name: 'Bash', tool_input: { command: 'cd src/solution && pac solution sync' }, tool_response: { stdout: 'Solution synced', stderr: '' } });
  assert.match(JSON.parse(stop(dir).stdout).reason, /end-of-run-reviewer/);
});

test('stop gate: changes in the dev environment come from each kind of tool, in both assistants', () => {
  const pending = (input, env) => {
    const dir = gitRepo({ 'README.md': 'x\n' });
    afterTool(dir, input, env);
    const file = path.join(dir, '.lbbexley', 'state', 's1.json');
    return fs.existsSync(file) && Boolean((state(dir).environment || {}).pending);
  };
  assert.ok(pending({ tool_name: 'mcp__dataverse__create_table', tool_input: {} }));
  assert.ok(pending({ toolName: 'dataverse/update_table', toolArgs: '{}', sessionId: 's1' }, COPILOT));
  assert.ok(pending({ toolName: 'flowagent/publish_flow', toolArgs: '{}', sessionId: 's1' }, COPILOT));
  assert.ok(pending({ toolName: 'canvas-authoring/compile_canvas', toolArgs: '{}', sessionId: 's1' }, COPILOT));
  assert.ok(pending({ tool_name: 'PowerShell', tool_input: { command: 'pac pages upload --path src/pages --modelVersion 2' } }));
  assert.ok(!pending({ tool_name: 'mcp__dataverse__read_query', tool_input: {} }), 'reading changes nothing');
  assert.ok(!pending({ tool_name: 'mcp__dataverse__create_record', tool_input: {} }), 'made-up records aren\'t in the solution, so there\'s nothing to sync');
  assert.ok(!pending({ toolName: 'dataverse/update_record', toolArgs: '{}', sessionId: 's1' }, COPILOT));
  assert.ok(!pending({ tool_name: 'mcp__plugin_power-automate_flowagent__get_flow', tool_input: {} }));
  assert.ok(!pending({ tool_name: 'mcp__plugin_canvas-apps_canvas-authoring__sync_canvas', tool_input: {} }));
  assert.ok(!pending({ tool_name: 'Bash', tool_input: { command: 'npm run check' } }));
});

test('stop gate: a canvas app built outside src/canvas is moved there, and a sync that never happens is handed to the person', () => {
  const dir = gitRepo({ 'README.md': 'x\n' });
  afterTool(dir, { tool_name: 'mcp__plugin_canvas-apps_canvas-authoring__compile_canvas', tool_input: { directory: path.join(dir, 'bookings-app') } });
  const first = JSON.parse(stop(dir).stdout);
  assert.match(first.reason, /compiled from bookings-app\. Move its \.pa\.yaml files into src\/canvas\/<app name>\//);
  assert.doesNotMatch(JSON.parse(stop(dir).stdout).reason, /Move its/, 'asked once');
  assert.equal(JSON.parse(stop(dir).stdout).decision, 'block', 'asked three times');
  const gaveUp = JSON.parse(stop(dir).stdout);
  assert.equal(gaveUp.decision, undefined);
  assert.match(gaveUp.systemMessage, /the latest version hasn't come into the repository/);
  assert.equal((state(dir).environment || {}).pending, false);
});

test('stop gate: with a remote, the work is pushed after it is committed', () => {
  const dir = gitRepo({ 'src/Home.pa.yaml': GOOD_CANVAS });
  const remote = fs.mkdtempSync(path.join(require('os').tmpdir(), 'lbbexley-remote-'));
  spawnSync('git', ['init', '-q', '--bare', remote]);
  spawnSync('git', ['remote', 'add', 'origin', remote], { cwd: dir });
  promptSent(dir, 'user');
  write(dir, 'src/Home.pa.yaml', GOOD_CANVAS.replace('BexleyWhite', 'BexleyPanel'));
  saved(dir, 'src/Home.pa.yaml');
  stop(dir);
  reviewerDone(dir, report({ work: [], harness: [] }));
  const saveIt = JSON.parse(stop(dir).stdout);
  assert.match(saveIt.reason, /then push it to GitHub with git push, and tell the person it's committed and pushed\. If the push fails, tell them why\./);
});

test('Power Automate guard: deletes and copies are blocked, runs and environment switches ask, building goes ahead', () => {
  const flow = (tool, env) => decideWith('flow-guard.js', { tool_name: tool, tool_input: {}, toolName: tool }, env).decision;
  assert.equal(flow('mcp__plugin_power-automate_flowagent__delete_flow'), 'deny');
  assert.equal(flow('mcp__plugin_power-automate_flowagent__copy_flow'), 'deny');
  assert.equal(flow('mcp__plugin_power-automate_flowagent__delete_connection'), 'deny');
  assert.equal(flow('mcp__plugin_power-automate_flowagent__run_flow'), 'ask');
  assert.equal(flow('mcp__plugin_power-automate_flowagent__invoke_operation'), 'ask');
  assert.equal(flow('mcp__plugin_power-automate_flowagent__set_current_env'), 'ask');
  assert.equal(flow('mcp__plugin_power-automate_flowagent__restore_backup'), 'ask');
  for (const op of ['create_flow', 'edit_flow', 'update_flow', 'publish_flow', 'disable_flow', 'get_flow', 'list_flows']) {
    assert.equal(flow(`mcp__plugin_power-automate_flowagent__${op}`), 'none', op);
  }
  assert.equal(flow('flowagent/delete_flow', COPILOT), 'deny', 'Copilot tool names');
  assert.equal(flow('edit', COPILOT), 'none', 'Copilot: other tools are left alone');
});

test('command guard: pac commands that use an environment only run against the dev environment in AGENTS.md', { skip: process.platform === 'win32' && 'the stand-in for pac is a shell script' }, () => {
  const bin = fs.mkdtempSync(path.join(require('os').tmpdir(), 'lbbexley-pac-'));
  const fakePac = url => {
    fs.writeFileSync(path.join(bin, 'pac'), url === null ? '#!/bin/sh\nexit 1\n' : `#!/bin/sh\necho "Org URL: ${url}"\n`);
    fs.chmodSync(path.join(bin, 'pac'), 0o755);
  };
  const agents = url => `# Test service\n\nBexley standards apply (lbbexley plugin).\n\n| | |\n|---|---|\n| Dev environment | ${url} |\n`;
  const dir = tempRepo({ 'AGENTS.md': agents('https://contoso-dev.crm11.dynamics.com') });
  const env = { PATH: `${bin}${path.delimiter}${process.env.PATH}` };
  const pac = (command, where = dir) => decideWith('command-guard.js', { cwd: where, tool_name: 'Bash', tool_input: { command } }, env);

  fakePac('https://contoso-dev.crm11.dynamics.com/');
  assert.equal(pac('pac pages upload --path src/pages --modelVersion 2').decision, 'none', 'the dev environment');
  assert.equal(pac('cd src/solution && pac solution sync').decision, 'none');
  fakePac('https://contoso.crm11.dynamics.com/');
  const wrong = pac('pac pages upload --path src/pages');
  assert.equal(wrong.decision, 'deny');
  assert.match(wrong.reason, /pac is connected to https:\/\/contoso\.crm11\.dynamics\.com\/, not the dev environment in AGENTS\.md \(https:\/\/contoso-dev\.crm11\.dynamics\.com\)/);
  assert.equal(pac('pac solution sync').decision, 'deny');
  assert.equal(pac('npm run check').decision, 'none', 'other commands are left alone');
  fakePac(null);
  assert.equal(pac('pac solution clone --name lbbexleyTest').decision, 'ask', 'pac can\'t say where it is');
  const unset = tempRepo({ 'AGENTS.md': agents('{{DEV_ENVIRONMENT_URL}}') });
  fakePac('https://contoso-dev.crm11.dynamics.com/');
  assert.equal(pac('pac pages upload --path src/pages', unset).decision, 'ask', 'no dev environment named yet');
});

test('file check: the planning notes Microsoft\'s canvas tools write next to an app aren\'t checked or reviewed', () => {
  const dir = gitRepo({ 'src/canvas/Bookings/Home.pa.yaml': GOOD_CANVAS });
  write(dir, 'src/canvas/Bookings/create-design.md', '# Design\n\n✅ Uses a gallery, e.g. for bookings.\n');
  const res = saved(dir, 'src/canvas/Bookings/create-design.md');
  assert.equal(res.code, 0);
  assert.equal(res.stdout, '');
  assert.ok(!fs.existsSync(path.join(dir, '.lbbexley/state/s1.json')) || !state(dir).edited.includes('src/canvas/Bookings/create-design.md'));
  write(dir, 'src/canvas/Bookings/Home.pa.yaml', BAD_CANVAS);
  assert.equal(saved(dir, 'src/canvas/Bookings/Home.pa.yaml').code, 2, 'the app\'s source still is');
});

test('command guard: an ordinary push goes ahead, one that could overwrite or delete work on GitHub is blocked', () => {
  const dir = gitRepo({ 'README.md': '# Test\n' });
  spawnSync('git', ['remote', 'add', 'origin', 'https://github.invalid/council/test-service.git'], { cwd: dir });
  const push = (command, env = {}) => decideWith('command-guard.js', { cwd: dir, tool_name: 'Bash', tool_input: { command } }, env);
  for (const ok of [
    'git push',
    'git push -u origin feature/bookings',
    'git push origin HEAD:main',
    'git add -A && git commit -m "Remove the -f flag and the --force wording" && git push',
    'git push 2>&1',
    'git push --set-upstream origin main > push.log',
  ]) assert.equal(push(ok).decision, 'none', ok);
  for (const risky of [
    'git push --force',
    'git push origin main --force-with-lease',
    'git push -fu origin main',
    'git push origin +main',
    'git push origin :old-branch',
    'git push --delete origin old-branch',
    'git push -d origin old-branch',
    'git push --mirror',
    'git push --prune origin',
    'git -C . push -f',
    'git commit -m "Tidy" && git push --force',
  ]) assert.equal(push(risky).decision, 'deny', risky);
  const elsewhere = push('git push https://github.invalid/someone-else/copy.git main');
  assert.equal(elsewhere.decision, 'ask');
  assert.match(elsewhere.reason, /isn't one of this repository's remotes/);
  assert.equal(decideWith('command-guard.js', { cwd: dir, toolName: 'run_in_terminal', toolArgs: JSON.stringify({ command: 'git push --force' }) }, COPILOT).decision, 'deny', 'Copilot');
  const other = fs.mkdtempSync(path.join(require('os').tmpdir(), 'lbbexley-other-'));
  assert.equal(decideWith('command-guard.js', { cwd: other, tool_name: 'Bash', tool_input: { command: 'git push --force' } }).decision, 'none', 'only in Bexley projects');
});
