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

test('Dataverse guard: schema tools run, reads and writes ask, deletes are denied', () => {
  const decide = (tool, env) => {
    const res = run(hook('dataverse-guard.js'), [], { input: { tool_name: tool, tool_input: {} }, env });
    if (!res.stdout) return 'none';
    const out = JSON.parse(res.stdout);
    return (out.hookSpecificOutput || out).permissionDecision;
  };
  assert.equal(decide('mcp__dataverse__list_tables'), 'none');
  assert.equal(decide('mcp__dataverse__describe_table'), 'none');
  assert.equal(decide('mcp__dataverse__read_query'), 'ask');
  assert.equal(decide('mcp__dataverse__create_record'), 'ask');
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

  const done = JSON.parse(stop(dir).stdout || '{}');
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
  const after = stop(dir).stdout;
  assert.ok(!after || JSON.parse(after).decision !== 'block', 'no second review request for the same content');
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
  assert.match(passed.systemMessage, /weren't fixed[\s\S]*Panel is too pale/);
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

  const done = JSON.parse(stop(dir, { stop_hook_active: true }).stdout || '{}');
  assert.equal(done.decision, undefined, 'the review covered both files');
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
  assert.equal(run(hook('stop-gate.js'), [], { input: { cwd: dir, sessionId: 's1' }, env: COPILOT }).stdout, '');
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
