'use strict';
// Reads a Microsoft Teams meeting transcript and cleans it for use as discovery
// material: speakers named by role, timestamps dropped, and contact details and
// reference numbers removed. Used by clean-transcript.js.
//
// Formats:
//   - WebVTT (.vtt), Teams' "Download as .vtt": cues with <v Name>text</v>
//   - Word (.docx), Teams' "Download as .docx": "Name   0:03" lines, each followed
//     by what was said, or the older layout of a time range, a name, then the text
//   - plain text (.txt, .md) in either Word layout, for example a .docx saved as text
//
// Nothing here prints or logs names: callers decide what to show.

const zlib = require('zlib');
const crypto = require('crypto');

// ---------------------------------------------------------------- reading files

// The text of word/document.xml in a .docx, one line per paragraph.
function docxText(buf) {
  const xml = zipEntry(buf, 'word/document.xml').toString('utf8');
  return xml
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

// One file from a zip archive (enough of the format for Word documents).
function zipEntry(buf, name) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('This .docx file is damaged or isn\'t a Word document.');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const entry = buf.toString('utf8', p + 46, p + 46 + nameLen);
    if (entry === name) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + size);
      if (method === 0) return data;
      if (method === 8) return zlib.inflateRawSync(data);
      throw new Error('This .docx file uses a compression method this tool can\'t read. Download the transcript as .vtt instead.');
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error('This .docx file has no document text. Download the transcript as .vtt instead.');
}

function readTranscript(buf, ext) {
  if (ext === '.docx') return docxText(buf);
  return buf.toString('utf8').replace(/^﻿/, '');
}

// ---------------------------------------------------------------- parsing

const TIME = String.raw`\d{1,2}:\d{1,2}(?::\d{1,2})?(?:[.,]\d+)?`;
const RANGE = new RegExp(`^\\s*${TIME}\\s*-->\\s*${TIME}\\b.*$`);
const NAME_THEN_TIME = new RegExp(`^(\\S.*?)[ \\t]+(${TIME})\\s*$`);
const TRANSCRIPTION_NOTE = /\b(started|stopped) transcription\b/i;

function parseVtt(text) {
  const entries = [];
  for (const block of text.replace(/\r/g, '').split(/\n\s*\n/)) {
    const lines = block.split('\n');
    const at = lines.findIndex(l => RANGE.test(l));
    if (at < 0) continue;
    const body = lines.slice(at + 1).join(' ').trim();
    if (!body) continue;
    const voices = [...body.matchAll(/<v(?:\.[^ >]*)?\s+([^>]+)>([\s\S]*?)(?:<\/v>|(?=<v[\s.])|$)/g)];
    if (voices.length) {
      for (const v of voices) entries.push({ speaker: v[1].trim(), text: stripTags(v[2]) });
    } else {
      // Some tools write "Name: what they said" instead of a voice tag.
      const plain = stripTags(body);
      const named = plain.match(/^(\p{Lu}[\p{L}'’.-]*(?:\s+\p{Lu}[\p{L}'’.-]*){0,3}):\s+(.+)$/u);
      entries.push(named ? { speaker: named[1], text: named[2] } : { speaker: '', text: plain });
    }
  }
  return entries.filter(e => e.text);
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

// Word layouts: "Name   0:03" then the text, or a time range, then the name, then the text.
function parseWordText(text) {
  const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim());
  const entries = [];
  let current = null;
  const push = () => {
    if (current && current.text.trim()) entries.push({ speaker: current.speaker, text: current.text.replace(/\s+/g, ' ').trim() });
    current = null;
  };

  // A speaker line starts with a letter, so a date and time ("2 November 2026, 10:00") isn't one.
  const speakerLine = l => {
    const m = l.match(NAME_THEN_TIME);
    return m && /^\p{L}/u.test(m[1]) ? m : null;
  };
  const named = lines.filter(speakerLine).length;
  const ranged = lines.filter(l => RANGE.test(l)).length;

  if (named >= ranged && named > 0) {
    for (const line of lines) {
      const m = speakerLine(line);
      if (m) {
        push();
        current = { speaker: m[1].trim(), text: '' };
      } else if (current && line) {
        current.text += ` ${line}`;
      }
    }
  } else if (ranged > 0) {
    for (let i = 0; i < lines.length; i++) {
      if (!RANGE.test(lines[i])) {
        if (current && lines[i]) current.text += ` ${lines[i]}`;
        continue;
      }
      push();
      const speaker = lines[i + 1] || '';
      current = { speaker: speaker.trim(), text: '' };
      i += 1;
    }
  }
  push();
  return entries;
}

function parseTranscript(text) {
  const trimmed = text.replace(/^\s+/, '');
  const entries = /^WEBVTT\b/.test(trimmed) ? parseVtt(text) : parseWordText(text);
  return entries.filter(e => !(TRANSCRIPTION_NOTE.test(e.text) && e.text.split(' ').length <= 6));
}

// Speakers in order of first appearance.
function speakersOf(entries) {
  const seen = [];
  for (const e of entries) if (e.speaker && !seen.includes(e.speaker)) seen.push(e.speaker);
  return seen;
}

// ---------------------------------------------------------------- names

// Words that are also common first names. On their own, they're replaced only
// where they're clearly used as a name ("Thanks, Will." or "Will, can you").
const COMMON_WORDS = new Set(['will', 'may', 'june', 'mark', 'bill', 'pat', 'sue', 'grace', 'joy', 'hope', 'faith', 'rose',
  'dawn', 'jack', 'frank', 'summer', 'iris', 'ruby', 'amber', 'jade', 'holly', 'ivy', 'lily', 'rich', 'chase', 'hunter',
  'april', 'august', 'sky', 'storm', 'robin', 'sterling', 'major', 'king', 'young', 'brown', 'green', 'white', 'black',
  'long', 'short', 'little', 'wise', 'hall', 'wood', 'hill', 'field', 'march', 'price', 'cook', 'baker', 'mason']);

// The forms of a speaker's name that might appear in what people said.
function nameForms(label) {
  const base = label.replace(/\s*[([].*?[)\]]\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const forms = new Set([label.trim(), base]);
  const comma = base.match(/^([^,]+),\s*(.+)$/);
  const ordered = comma ? `${comma[2]} ${comma[1]}` : base;
  forms.add(ordered);
  for (const part of ordered.split(/[\s-]+/)) if (/^\p{Lu}[\p{L}'’]+$/u.test(part) && part.length >= 2) forms.add(part);
  return [...forms].filter(Boolean);
}

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Replaces every speaker's name in the text with their role.
function replaceNames(text, roles) {
  const forms = [];
  for (const [label, role] of Object.entries(roles)) for (const f of nameForms(label)) forms.push([f, role]);
  forms.sort((a, b) => b[0].length - a[0].length);
  let out = text;
  for (const [form, role] of forms) {
    const single = !/\s/.test(form);
    if (single && COMMON_WORDS.has(form.toLowerCase())) {
      out = out.replace(new RegExp(`(?<![\\p{L}\\d])${escape(form)}(?=\\s*[,.?!]|['’]s\\b)`, 'gu'), role);
    } else {
      out = out.replace(new RegExp(`(?<![\\p{L}\\d])${escape(form)}(?![\\p{L}\\d])`, 'gu'), role);
    }
  }
  return out;
}

// True if a role contains any part of the speaker's name.
function roleNamesSpeaker(label, role) {
  const words = new Set(String(role).toLowerCase().split(/[^\p{L}]+/u).filter(Boolean));
  return nameForms(label).filter(f => !/\s/.test(f)).some(f => words.has(f.toLowerCase()));
}

// ---------------------------------------------------------------- contact details and numbers

function luhn(d) {
  let sum = 0;
  let dbl = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

function nhs(d) {
  if (d.length !== 10) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check === 11) check = 0;
  return check !== 10 && check === Number(d[9]);
}

const digits = s => s.replace(/\D/g, '');

// In the order they're applied. Each replaces what it finds and is counted.
const REDACTIONS = [
  {
    kind: 'email address',
    re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g,
  },
  {
    // Spoken: "jo dot sample at example dot gov dot uk".
    kind: 'email address',
    re: /\b[\p{L}\d]+(?:\s+dot\s+[\p{L}\d]+)*\s+at\s+[\p{L}\d-]+(?:\s+dot\s+[\p{L}\d-]+)+\b/giu,
    keep: m => !(/\bdot\b.*\bat\b/i.test(m) || (m.match(/\bdot\b/gi) || []).length >= 2),
  },
  {
    kind: 'National Insurance number',
    re: /\b[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z] ?\d{2} ?\d{2} ?\d{2} ?[A-D]\b/gi,
  },
  {
    kind: 'card number',
    re: /(?<![\d-])(?:\d[ -]?){12,18}\d(?![\d-])/g,
    keep: m => !luhn(digits(m)) || digits(m).length < 13,
  },
  {
    kind: 'NHS number',
    re: /(?<![\d-])\d{3}[ -]?\d{3}[ -]?\d{4}(?![\d-])/g,
    keep: m => !nhs(digits(m)),
  },
  {
    kind: 'phone number',
    re: /(?<![\w+])(?:\+44\s?(?:\(0\)\s?)?|\(?0)\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}(?!\d)/g,
  },
  {
    // Case, account and property reference numbers: 8 or more digits, with or without spaces.
    kind: 'reference number',
    re: /(?<![\d-])\d(?:[ -]?\d){7,}(?![\d-])/g,
  },
  {
    // Full postcodes only: "DA6" on its own is an area, not an address.
    kind: 'postcode',
    re: /\b[A-Z]{1,2}\d[A-Z\d]? ?\d[ABD-HJLNP-UW-Z]{2}\b/g,
  },
];

const LABEL = {
  'email address': '[email address removed]',
  'National Insurance number': '[National Insurance number removed]',
  'card number': '[card number removed]',
  'NHS number': '[NHS number removed]',
  'phone number': '[phone number removed]',
  'reference number': '[reference number removed]',
  'postcode': '[postcode removed]',
};

function redact(text, counts) {
  let out = text;
  for (const r of REDACTIONS) {
    out = out.replace(r.re, m => {
      if (r.keep && r.keep(m)) return m;
      counts[r.kind] = (counts[r.kind] || 0) + 1;
      return LABEL[r.kind];
    });
  }
  return out;
}

// ---------------------------------------------------------------- the cleaned document

const FINGERPRINT = /\n<!-- transcript:clean fingerprint=([0-9a-f]{16}) -->\n?$/;

const fingerprint = body => crypto.createHash('sha256').update(body).digest('hex').slice(0, 16);

// True if a cleaned file has been edited since this tool wrote it.
function editedSinceCleaned(text) {
  const m = text.match(FINGERPRINT);
  if (!m) return true;
  return fingerprint(text.slice(0, m.index)) !== m[1];
}

function longDate(d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
}

// entries: parsed transcript; roles: { speaker label: role }.
function cleanTranscript(entries, roles, { date = new Date() } = {}) {
  const counts = {};
  const paragraphs = [];
  for (const e of entries) {
    const who = (e.speaker && roles[e.speaker]) || 'Unknown speaker';
    const said = redact(replaceNames(e.text, roles), counts);
    const last = paragraphs[paragraphs.length - 1];
    if (last && last.who === who) last.said += ` ${said}`;
    else paragraphs.push({ who, said });
  }
  const body = [
    '# Discovery conversation (cleaned transcript)',
    '',
    `Cleaned from a Teams meeting transcript on ${longDate(date)} with \`npm run transcript:clean\`. People are named by role. Email addresses, phone numbers, full postcodes and reference numbers were removed automatically. Read it all before you use it, and remove anything else that could identify a person.`,
    '',
    ...paragraphs.flatMap(p => [`**${p.who}:** ${p.said}`, '']),
  ].join('\n');
  return { markdown: `${body}\n<!-- transcript:clean fingerprint=${fingerprint(body)} -->\n`, counts, paragraphs: paragraphs.length };
}

module.exports = {
  readTranscript, parseTranscript, speakersOf, nameForms, replaceNames, roleNamesSpeaker,
  redact, cleanTranscript, editedSinceCleaned, zipEntry, docxText,
};
