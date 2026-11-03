'use strict';
// The transcript cleaner: reading Teams transcripts, naming speakers by role,
// removing contact details and numbers, and the command line's safety stops.
// Every name, number and address here is fictional, and the real-looking
// identifiers are built at run time (see helpers.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { spawnSync } = require('child_process');
const { SCRIPTS, tempRepo, run, nhsNumber, luhnNumber, spaced, niNumber } = require('./helpers');
const t = require('../plugins/lbbexley/scripts/lib/transcript');

const CLEAN = path.join(SCRIPTS, 'clean-transcript.js');

const VTT = [
  'WEBVTT',
  '',
  'a1b2c3d4/12-0',
  '00:00:03.120 --> 00:00:05.800',
  '<v Alex Testperson>Thanks for joining, everyone.</v>',
  '',
  'a1b2c3d4/13-0',
  '00:00:06.000 --> 00:00:09.100',
  '<v Alex Testperson>Today we want to understand how requests come in.</v>',
  '',
  'a1b2c3d4/14-0',
  '00:00:09.500 --> 00:00:14.000',
  '<v Sam Example (Guest)>Most come by phone, then',
  'someone types them into a spreadsheet. Alex, you saw that last week.</v>',
  '',
].join('\n');

// A minimal .docx: a zip holding word/document.xml with one paragraph per line.
function docx(lines) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="x"><w:body>${lines
    .map(l => `<w:p><w:r><w:t xml:space="preserve">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</w:t></w:r></w:p>`)
    .join('')}</w:body></w:document>`;
  const name = Buffer.from('word/document.xml');
  const data = zlib.deflateRawSync(Buffer.from(xml));
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(Buffer.byteLength(xml), 22);
  local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(Buffer.byteLength(xml), 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(0, 42);
  const centralStart = local.length + name.length + data.length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + name.length, 12);
  end.writeUInt32LE(centralStart, 16);
  return Buffer.concat([local, name, data, central, name, end]);
}

const WORD_LINES = [
  'Discovery session-20261102_100003-Meeting Transcript',
  '2 November 2026, 10:00',
  '45m 3s',
  'Alex Testperson started transcription',
  'Alex Testperson   0:03',
  'Thanks for joining, everyone.',
  'Sam Example   0:10',
  'Most come by phone.',
  'Thanks, Alex.',
];

test('reads Teams WebVTT, joining cue lines and keeping who said what', () => {
  const entries = t.parseTranscript(VTT);
  assert.deepEqual(t.speakersOf(entries), ['Alex Testperson', 'Sam Example (Guest)']);
  assert.equal(entries.length, 3);
  assert.equal(entries[2].text, 'Most come by phone, then someone types them into a spreadsheet. Alex, you saw that last week.');
});

test('reads WebVTT cues written as "Name: text" without voice tags', () => {
  const vtt = 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nJo Sample: The form is too long.\n';
  const entries = t.parseTranscript(vtt);
  assert.deepEqual(entries, [{ speaker: 'Jo Sample', text: 'The form is too long.' }]);
});

test('reads the Word layout, skipping the header, the date line and "started transcription"', () => {
  const entries = t.parseTranscript(WORD_LINES.join('\n'));
  assert.deepEqual(t.speakersOf(entries), ['Alex Testperson', 'Sam Example']);
  assert.deepEqual(entries.map(e => e.text), ['Thanks for joining, everyone.', 'Most come by phone. Thanks, Alex.']);
});

test('reads the older Word layout: a time range, the name, then the text', () => {
  const text = ['0:0:0.0 --> 0:0:5.270', 'Testperson, Alex', 'Thanks for joining.', '', '0:0:5.270 --> 0:0:9.100', 'Example, Sam', 'Happy to help.'].join('\n');
  const entries = t.parseTranscript(text);
  assert.deepEqual(t.speakersOf(entries), ['Testperson, Alex', 'Example, Sam']);
  assert.equal(entries[1].text, 'Happy to help.');
});

test('reads a .docx straight from Teams', () => {
  const text = t.readTranscript(docx(WORD_LINES), '.docx');
  const entries = t.parseTranscript(text);
  assert.deepEqual(t.speakersOf(entries), ['Alex Testperson', 'Sam Example']);
  assert.throws(() => t.readTranscript(Buffer.from('not a zip at all, just text'), '.docx'), /damaged or isn't a Word document/);
});

test('names every speaker by role, in what they said as well as who said it', () => {
  const entries = t.parseTranscript(VTT);
  const roles = { 'Alex Testperson': 'Service manager', 'Sam Example (Guest)': 'Team leader' };
  const { markdown } = t.cleanTranscript(entries, roles, { date: new Date('2026-11-03T10:00:00Z') });
  assert.doesNotMatch(markdown, /Alex|Testperson|Sam|Example/);
  assert.match(markdown, /\*\*Service manager:\*\* Thanks for joining, everyone\. Today we want/, 'consecutive lines by one speaker are joined');
  assert.match(markdown, /\*\*Team leader:\*\* Most come by phone.*Service manager, you saw that last week\./);
  assert.match(markdown, /on 3 November 2026/);
});

test('handles "Surname, First" labels and names that are also everyday words', () => {
  const roles = { 'Testperson, Alex': 'Officer', 'Will Brown': 'Analyst' };
  assert.equal(t.replaceNames('Alex Testperson and Testperson agreed.', roles), 'Officer and Officer agreed.');
  assert.equal(t.replaceNames('Thanks, Will. Will that work? Brown\'s idea is good. The brown bin.', roles),
    'Thanks, Analyst. Will that work? Analyst\'s idea is good. The brown bin.');
  assert.equal(t.roleNamesSpeaker('Alex Testperson', 'Alex\'s manager'), true);
  assert.equal(t.roleNamesSpeaker('Alex Testperson', 'Service manager'), false);
});

test('removes contact details and numbers, and counts what it removed', () => {
  const nhs = nhsNumber('943476591');
  const card = luhnNumber('453201511283036');
  const counts = {};
  const out = t.redact([
    'Email alex.testperson@example.com or jo dot sample at example dot org dot uk.',
    'Ring 01632 960123, 07700 900456 or +44 20 7946 0123.',
    `NI ${niNumber()}, NHS ${spaced(nhs)}, card ${card}.`,
    'Case 12345678 at XX9 9XX.',
  ].join(' '), counts);
  assert.doesNotMatch(out, /@|example dot|01632|07700|7946|12 34 56|\d{8}|XX9/);
  assert.deepEqual(counts, {
    'email address': 2, 'phone number': 3, 'National Insurance number': 1, 'NHS number': 1,
    'card number': 1, 'reference number': 1, 'postcode': 1,
  });
});

test('leaves ordinary words and numbers alone', () => {
  const text = 'About 12,000 requests a year in the DA6 area, 40% by phone. Look at this dot com page in Q3 4th week. The 2 November meeting ran 45 minutes.';
  const counts = {};
  assert.equal(t.redact(text, counts), text);
  assert.deepEqual(counts, {});
});

test('notices when a cleaned file has been edited by hand', () => {
  const { markdown } = t.cleanTranscript(t.parseTranscript(VTT), { 'Alex Testperson': 'A', 'Sam Example (Guest)': 'B' });
  assert.equal(t.editedSinceCleaned(markdown), false);
  assert.equal(t.editedSinceCleaned(markdown.replace('Thanks for joining', 'Thank you for joining')), true);
  assert.equal(t.editedSinceCleaned('# Notes I wrote myself\n'), true);
});

// ------------------------------------------------------------ the command line

function setUp(content = VTT, name = 'kick-off.vtt') {
  const repo = tempRepo({ 'AGENTS.md': '# Test service\n' });
  const away = fs.mkdtempSync(path.join(os.tmpdir(), 'lbbexley-downloads-'));
  const input = path.join(away, name);
  fs.writeFileSync(input, content);
  return { repo, away, input, roles: path.join(away, `${path.basename(name, path.extname(name))}.roles.json`) };
}

const clean = (repo, args) => run(CLEAN, args, { cwd: repo, env: { INIT_CWD: repo } });

test('cleans into docs/discovery/, keeps names next to the original and never prints them', () => {
  const { repo, input, roles } = setUp();
  const res = clean(repo, [input]);
  assert.equal(res.code, 0, res.stderr);
  const out = fs.readFileSync(path.join(repo, 'docs/discovery/transcript-1.md'), 'utf8');
  assert.match(out, /\*\*Speaker 1:\*\*.*\*\*Speaker 2:\*\*/s);
  assert.doesNotMatch(out + res.stdout + res.stderr, /Alex|Testperson|Sam Example/);
  assert.match(fs.readFileSync(path.join(repo, 'docs/discovery/.gitignore'), 'utf8'), /^\*$/m);
  const saved = JSON.parse(fs.readFileSync(roles, 'utf8'));
  assert.deepEqual(saved.speakers, { 'Alex Testperson': 'Speaker 1', 'Sam Example (Guest)': 'Speaker 2' });
  assert.equal(saved.output, 'docs/discovery/transcript-1.md');
  assert.match(res.stdout, /2 speakers are still called "Speaker" and a number/);
});

test('uses the roles from the roles file when run again, into the same file', () => {
  const { repo, input, roles } = setUp();
  clean(repo, [input]);
  const saved = JSON.parse(fs.readFileSync(roles, 'utf8'));
  saved.speakers['Alex Testperson'] = 'Service manager';
  saved.speakers['Sam Example (Guest)'] = 'Team leader';
  fs.writeFileSync(roles, JSON.stringify(saved));
  const res = clean(repo, [input]);
  assert.equal(res.code, 0, res.stderr);
  const out = fs.readFileSync(path.join(repo, 'docs/discovery/transcript-1.md'), 'utf8');
  assert.match(out, /\*\*Team leader:\*\* .*Service manager, you saw that/);
  assert.ok(!fs.existsSync(path.join(repo, 'docs/discovery/transcript-2.md')));
  assert.doesNotMatch(res.stdout, /still called "Speaker"/);
});

test('stops if a role includes the speaker\'s name, without printing it', () => {
  const { repo, input, roles } = setUp();
  clean(repo, [input]);
  const saved = JSON.parse(fs.readFileSync(roles, 'utf8'));
  saved.speakers['Alex Testperson'] = 'Alex (manager)';
  fs.writeFileSync(roles, JSON.stringify(saved));
  const res = clean(repo, [input]);
  assert.equal(res.code, 1);
  assert.match(res.stderr, /speaker 1 .* includes part of their name/);
  assert.doesNotMatch(res.stderr, /Alex/);
});

test('won\'t replace a cleaned file you\'ve edited, unless you add --force', () => {
  const { repo, input } = setUp();
  clean(repo, [input]);
  const file = path.join(repo, 'docs/discovery/transcript-1.md');
  fs.appendFileSync(file, '\nA note I added.\n');
  const res = clean(repo, [input]);
  assert.equal(res.code, 1);
  assert.match(res.stderr, /has been edited since it was cleaned/);
  assert.equal(clean(repo, [input, '--force']).code, 0);
  assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /A note I added/);
});

test('refuses an original transcript inside the repository', () => {
  const repo = tempRepo({ 'AGENTS.md': '# Test\n', 'docs/discovery/raw.vtt': VTT });
  const res = clean(repo, [path.join(repo, 'docs/discovery/raw.vtt')]);
  assert.equal(res.code, 1);
  assert.match(res.stderr, /inside this repository's folder/);
  assert.ok(!fs.existsSync(path.join(repo, 'docs/discovery/transcript-1.md')));
});

test('stops when Git would commit the cleaned file', () => {
  const { repo, input } = setUp();
  spawnSync('git', ['init', '-q'], { cwd: repo });
  fs.mkdirSync(path.join(repo, 'docs/discovery'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'docs/discovery/.gitignore'), '# nothing ignored\n');
  const res = clean(repo, [input]);
  assert.equal(res.code, 1);
  assert.match(res.stderr, /Git would commit docs\/discovery\/transcript-1\.md/);
  fs.writeFileSync(path.join(repo, 'docs/discovery/.gitignore'), '*\n!.gitignore\n!README.md\n');
  assert.equal(clean(repo, [input]).code, 0);
});

test('reads .docx and .txt, and says what to do with anything else', () => {
  const word = setUp(docx(WORD_LINES), 'meeting.docx');
  assert.equal(clean(word.repo, [word.input]).code, 0);
  const text = setUp(WORD_LINES.join('\r\n'), 'meeting.txt');
  assert.equal(clean(text.repo, [text.input]).code, 0);
  const pdf = setUp('%PDF-1.7', 'meeting.pdf');
  const res = clean(pdf.repo, [pdf.input]);
  assert.equal(res.code, 1);
  assert.match(res.stderr, /\.vtt \(best\), \.docx, or a \.txt copy/);
  const empty = setUp('Just some notes with no speakers.', 'notes.txt');
  assert.match(clean(empty.repo, [empty.input]).stderr, /Couldn't find who said what/);
  assert.equal(clean(empty.repo, []).code, 2);
});
