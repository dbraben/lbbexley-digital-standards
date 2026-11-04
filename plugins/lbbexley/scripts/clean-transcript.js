#!/usr/bin/env node
'use strict';
// Cleans a Microsoft Teams meeting transcript so it can be used as discovery
// material for a Bexley service.
//
//   npm run transcript:clean -- <transcript> [--force]
//
// <transcript> is the file you downloaded from Teams: .vtt (best), .docx or .txt.
// Keep it outside this repository, for example in your Downloads folder: the
// assistant can read anything inside the repository.
//
// It writes:
//   docs/discovery/transcript-<n>.md   the cleaned transcript. docs/discovery/ is
//                                      never committed, so it stays on your computer
//   <transcript>.roles.json            next to the original: each speaker's name and
//                                      the role to use instead. Names stay there,
//                                      outside the repository
//
// Edit the roles file to name speakers by role, then run this again. Once you've
// edited the cleaned file by hand, it's only replaced if you add --force.
//
// It never prints names. People run it, not assistants: .claude/settings.json
// denies it to Claude Code, because it reads the original transcript.
//
// Exit codes: 0 cleaned, 1 stopped (the message says why), 2 usage error.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const t = require('./lib/transcript');
const { findPersonalData } = require('./lib/personal-data');

const FORMATS = ['.vtt', '.docx', '.txt', '.md'];
const DISCOVERY = path.join('docs', 'discovery');
const GITIGNORE = [
  '# Discovery material stays on your computer: it never goes into Git.',
  '# Only this file and README.md are committed. See README.md.',
  '*',
  '!.gitignore',
  '!README.md',
  '',
].join('\n');

const USAGE = 'Usage: npm run transcript:clean -- <transcript.vtt|.docx|.txt> [--force]\n';

class Stop extends Error {}

function parseArgs(argv) {
  const opts = { force: false, root: process.cwd(), input: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') opts.force = true;
    else if (a === '--root') opts.root = argv[++i];
    else if (a === '--help' || a === '-h') opts.help = true;
    else if (a.startsWith('--')) throw new Error(`Unknown option ${a}`);
    else if (opts.input) throw new Error('Give one transcript at a time.');
    else opts.input = a;
  }
  return opts;
}

function resolveInput(input) {
  const expanded = input.replace(/^~(?=$|[\\/])/, os.homedir());
  return path.resolve(process.env.INIT_CWD || process.cwd(), expanded);
}

const inside = (child, parent) => {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};

function readRoles(file) {
  if (!fs.existsSync(file)) return { speakers: {} };
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!data || typeof data.speakers !== 'object') throw new Error();
    return data;
  } catch {
    throw new Stop(`The roles file next to the transcript isn't valid JSON. Fix it, or delete it to start again:\n  ${file}`);
  }
}

function nextOutput(root) {
  for (let n = 1; ; n++) {
    const rel = path.join(DISCOVERY, `transcript-${n}.md`);
    if (!fs.existsSync(path.join(root, rel))) return rel;
  }
}

// Stop if Git would commit the cleaned file (an older repository without docs/discovery/.gitignore).
function checkIgnored(root, rel) {
  const git = spawnSync('git', ['check-ignore', '-q', '--no-index', rel], { cwd: root, encoding: 'utf8' });
  if (git.error || git.status === 128) return; // no Git, or not a repository
  if (git.status !== 0) {
    throw new Stop(`Git would commit ${rel.split(path.sep).join('/')}. Check that ${DISCOVERY.split(path.sep).join('/')}/.gitignore contains a line with just "*", then run this again.`);
  }
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`${e.message}\n${USAGE}`);
    return 2;
  }
  if (opts.help || !opts.input) {
    (opts.help ? process.stdout : process.stderr).write(USAGE);
    return opts.help ? 0 : 2;
  }

  const root = path.resolve(opts.root);
  const input = resolveInput(opts.input);
  const ext = path.extname(input).toLowerCase();

  if (!fs.existsSync(input) || !fs.statSync(input).isFile()) throw new Stop(`There's no file at ${input}`);
  if (!FORMATS.includes(ext)) throw new Stop('Use the transcript file Teams gives you: .vtt (best), .docx, or a .txt copy.');
  if (inside(input, root)) {
    throw new Stop('The original transcript is inside this repository\'s folder, where the assistant can read it. Move it somewhere else first, such as your Downloads folder, then run this again.');
  }

  const entries = t.parseTranscript(t.readTranscript(fs.readFileSync(input), ext));
  if (!entries.length) throw new Stop('Couldn\'t find who said what in this file. Download the transcript from Teams as a .vtt file, and try again with that.');

  // Roles: names stay in this file, next to the original.
  const rolesFile = path.join(path.dirname(input), `${path.basename(input, path.extname(input))}.roles.json`);
  const saved = readRoles(rolesFile);
  const speakers = t.speakersOf(entries);
  const roles = {};
  const used = Object.values(saved.speakers).map(String);
  let next = 1;
  speakers.forEach((label, i) => {
    let role = typeof saved.speakers[label] === 'string' ? saved.speakers[label].trim() : '';
    if (!role) {
      while (used.includes(`Speaker ${next}`)) next++;
      role = `Speaker ${next}`;
      used.push(role);
    }
    if (t.roleNamesSpeaker(label, role)) {
      throw new Stop(`The role for speaker ${i + 1} in the roles file includes part of their name. Use a role only, such as "Team leader":\n  ${rolesFile}`);
    }
    roles[label] = role;
  });

  const output = typeof saved.output === 'string' && saved.output ? saved.output : nextOutput(root);
  const outputAbs = path.resolve(root, output);
  if (!inside(outputAbs, path.join(root, DISCOVERY))) throw new Stop(`The cleaned file must go in ${DISCOVERY}/. Fix "output" in the roles file:\n  ${rolesFile}`);

  fs.mkdirSync(path.dirname(outputAbs), { recursive: true });
  const ignore = path.join(root, DISCOVERY, '.gitignore');
  if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, GITIGNORE);
  checkIgnored(root, path.relative(root, outputAbs));

  if (fs.existsSync(outputAbs) && t.editedSinceCleaned(fs.readFileSync(outputAbs, 'utf8')) && !opts.force) {
    throw new Stop(`${output.split(path.sep).join('/')} has been edited since it was cleaned. To replace it with a fresh copy, run this again with --force.`);
  }

  const { markdown, counts, paragraphs } = t.cleanTranscript(entries, roles);
  fs.writeFileSync(outputAbs, markdown);
  fs.writeFileSync(rolesFile, `${JSON.stringify({
    about: 'The speakers in this transcript and the role to use for each. This file holds names, so keep it here, next to the original transcript, and never put it in a repository. Change each value to a role, such as "Service manager", then run npm run transcript:clean again.',
    output: output.split(path.sep).join('/'),
    speakers: Object.fromEntries(speakers.map(s => [s, roles[s]])),
  }, null, 2)}\n`);

  const order = ['email address', 'phone number', 'postcode', 'National Insurance number', 'NHS number', 'card number', 'reference number'];
  const removed = order.filter(kind => counts[kind]).map(kind => plural(counts[kind], kind)).join(', ');
  const unnamed = speakers.filter(s => /^Speaker \d+$/.test(roles[s])).length;
  const outRel = output.split(path.sep).join('/');
  const lines = [
    `Cleaned: ${plural(speakers.length, 'speaker')}, ${plural(paragraphs, 'paragraph')}.`,
    `Saved: ${outRel} (Git ignores ${DISCOVERY.split(path.sep).join('/')}/, but approved AI tools may still read it, so keep it clean)`,
    `Removed: ${removed || 'nothing found'}.`,
  ];
  if (unnamed) {
    lines.push(`${plural(unnamed, 'speaker')} ${unnamed === 1 ? 'is' : 'are'} still called "Speaker" and a number. To use roles instead, such as "Service manager", edit this file and run this again:`, `  ${rolesFile}`);
  }
  const left = findPersonalData(markdown, { consumerDomains: new Set() });
  if (left.length) lines.push(`The standards check still finds ${plural(left.length, 'thing')} that look${left.length === 1 ? 's' : ''} like personal data. Find and remove ${left.length === 1 ? 'it' : 'them'} before you use the file.`);
  lines.push(
    '',
    `Next: read ${outRel} from start to finish, and remove anything else that could identify a person:`,
    'names of people who weren\'t speaking, addresses, and details of anyone\'s case or situation.',
    'Then delete the original transcript and the roles file when you no longer need them.',
  );
  process.stdout.write(`${lines.join('\n')}\n`);
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (e) {
    if (e instanceof Stop) {
      process.stderr.write(`${e.message}\n`);
      process.exitCode = 1;
    } else {
      process.stderr.write(`Couldn't clean the transcript: ${e.message}\n`);
      process.exitCode = 1;
    }
  }
}

module.exports = { main, parseArgs, resolveInput, inside };
