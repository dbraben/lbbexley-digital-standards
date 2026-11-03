#!/usr/bin/env node
'use strict';
// Runs when a subagent finishes. When it's the end-of-run reviewer, this:
//   - marks the files it reviewed, so the stop gate knows the review happened
//   - records the problems it found, which the stop gate holds open until the
//     files change
//   - appends its ideas for improving the harness to .lbbexley/improvements.md,
//     which /lbbexley:improve turns into changes here or proposals for the
//     Bexley standards
// Quiet for every other subagent and outside Bexley app repositories.

const fs = require('fs');
const path = require('path');
const { readStdin, normalise } = require('./lib/hook-io');
const { isBexleyProject, loadStandards } = require('./lib/config');
const { checkContent } = require('./lib/checks');
const { load, save, hashFile } = require('./lib/state');

const IDEAS_FILE = '.lbbexley/improvements.md';

const HEADER = [
  '# Harness improvement ideas',
  '',
  'Logged by the end-of-run check, which runs on a smaller model after each piece of work.',
  'Run `/lbbexley:improve` (Copilot: the lbbexley-improve skill) to work through them: ideas for this service',
  'are applied here, and ideas for the Bexley standards become proposals for the Digital Team.',
  '',
].join('\n');

function parseReport(text) {
  const blocks = [...String(text).matchAll(/```(?:json)?\s*\n([\s\S]*?)```/g)];
  for (let i = blocks.length - 1; i >= 0; i--) {
    try {
      const report = JSON.parse(blocks[i][1]);
      if (report && (Array.isArray(report.work) || Array.isArray(report.harness))) return report;
    } catch {
      // try the next block
    }
  }
  return null;
}

function clean(s, max = 400) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

// "text" as a sentence: ends with a full stop unless it already has one.
function sentence(s) {
  return s && !/[.!?]$/.test(s) ? `${s}.` : s;
}

// Ideas are logged one per line. An idea that would itself fail the standards
// check (personal data, for example) is dropped, so the log never holds the
// assistant back.
function appendIdeas(root, ideas, sessionId) {
  if (!ideas.length) return 0;
  const cfg = loadStandards();
  const file = path.join(root, IDEAS_FILE);
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    text = HEADER;
  }
  const date = new Date().toISOString().slice(0, 10);
  const lines = [];
  for (const idea of ideas) {
    const suggestion = clean(idea && idea.suggestion);
    if (!suggestion || [text, ...lines].join('\n').toLowerCase().includes(suggestion.toLowerCase())) continue;
    const area = clean(idea.area || 'harness', 40);
    const target = clean(idea.target || '', 60);
    const evidence = clean(idea.evidence || '', 300);
    const line = `- [ ] ${date} · ${area}${target ? `: ${target}` : ''} · ${sentence(suggestion)}${evidence ? ` Evidence: ${sentence(evidence)}` : ''} (session ${String(sessionId).slice(0, 8)})`;
    if (checkContent(IDEAS_FILE, line, cfg).length) continue;
    lines.push(line);
  }
  if (lines.length) {
    // One list: a blank line after the header, none between batches.
    const body = text.replace(/\s+$/, '');
    const gap = /^- \[[ xX]\]/m.test(body) ? '\n' : '\n\n';
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${body}${gap}${lines.join('\n')}\n`);
  }
  return lines.length;
}

(async () => {
  if (process.env.LBBEXLEY_NESTED === '1') return;
  const input = normalise(await readStdin());
  const root = input.cwd;
  if (!isBexleyProject(root)) return;
  const isReviewer = /end-of-run-reviewer|lbbexley-check/i.test(input.agentType) || /END-OF-RUN REVIEW/.test(input.lastMessage);
  if (!isReviewer) return;

  const report = parseReport(input.lastMessage) || { work: [], harness: [] };
  const state = load(root, input.sessionId);
  const rel = f => String(f || '').replace(/\\/g, '/').replace(/^\.\//, '');

  for (const f of state.edited) state.reviewed[f] = hashFile(root, f);
  state.openItems = (report.work || [])
    .filter(w => w && w.file && fs.existsSync(path.join(root, rel(w.file))))
    .map(w => ({ file: rel(w.file), line: Number(w.line) || null, problem: sentence(clean(w.problem)), fix: sentence(clean(w.fix)), hash: hashFile(root, rel(w.file)) }));
  const ideas = appendIdeas(root, Array.isArray(report.harness) ? report.harness : [], input.sessionId);
  state.ideasLogged = (state.ideasLogged || 0) + ideas;
  state.lastReview = {
    at: new Date().toISOString(),
    work: (report.work || []).length,
    harness: ideas,
    readable: Boolean(parseReport(input.lastMessage)),
    announced: false,
  };
  save(root, input.sessionId, state);
})().catch(() => {
  process.exitCode = 0;
});
