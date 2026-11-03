'use strict';
// Finds values that look like real personal data: National Insurance numbers,
// NHS numbers, payment card numbers and personal (consumer) email addresses.
//
// The patterns are deliberately narrow to keep false alarms low, and the safe
// fictional formats from the data-protection skill never match:
//   - NI numbers with a QQ prefix (never issued), e.g. QQ 12 34 56 C
//   - NHS numbers starting 999 (reserved for testing)
//   - email addresses at example.com, example.org or example.net
//   - the payment providers' published test card numbers (TEST_CARDS below)
// Matches are masked before they are reported, so the guardrails never echo
// the full value back into logs or the conversation.

// Published test card numbers that only work in payment sandboxes.
const TEST_CARDS = new Set([
  '4111111111111111', '4242424242424242', '4000056655665556', '4444333322221111',
  '4000000000000002', '4000000000000077', '4000000000000101', '4000000000003220',
  '5555555555554444', '5200828282828210', '5105105105105100', '5454545454545454',
  '2223003122003222', '378282246310005', '371449635398431', '6011111111111117',
]);

const NI = /\b(?!BG|GB|KN|NK|NT|TN|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z] ?\d{2} ?\d{2} ?\d{2} ?[A-D]\b/gi;
const NHS_SPACED = /\b\d{3}[ -]\d{3}[ -]\d{4}\b/g;
const NHS_PLAIN = /\b\d{10}\b/g;
const CARD_GROUPED = /\b\d{4}[ -]\d{4}[ -]\d{4}[ -]\d{1,7}\b|\b\d{4}[ -]\d{6}[ -]\d{5}\b/g;
const CARD_PLAIN = /\b\d{15,16}\b/g;
const EMAIL = /\b[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)\b/g;

function digitsOf(s) {
  return s.replace(/\D/g, '');
}

function nhsValid(d) {
  if (d.length !== 10 || d.startsWith('999') || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check === 11) check = 0;
  if (check === 10) return false;
  return check === Number(d[9]);
}

function luhnValid(d) {
  if (d.length < 13 || d.length > 19 || !/^[2-6]/.test(d) || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  let double = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

function mask(value) {
  const v = String(value);
  if (v.includes('@')) {
    const [local, domain] = v.split('@');
    return `${local.slice(0, 1)}***@${domain}`;
  }
  let seen = 0;
  const total = v.replace(/[^A-Za-z0-9]/g, '').length;
  return v.replace(/[A-Za-z0-9]/g, ch => {
    seen += 1;
    return seen <= 2 || seen > total - 1 ? ch : '*';
  });
}

function findPersonalData(text, cfg) {
  const found = [];
  const add = (kind, match, index) => found.push({ kind, index, masked: mask(match) });
  const s = String(text || '');

  for (const m of s.matchAll(NI)) add('National Insurance number', m[0], m.index);

  for (const m of s.matchAll(NHS_SPACED)) {
    if (nhsValid(digitsOf(m[0]))) add('NHS number', m[0], m.index);
  }
  for (const m of s.matchAll(NHS_PLAIN)) {
    const near = s.slice(Math.max(0, m.index - 40), m.index + 50);
    if (/\bNHS\b/i.test(near) && nhsValid(m[0])) add('NHS number', m[0], m.index);
  }

  for (const re of [CARD_GROUPED, CARD_PLAIN]) {
    for (const m of s.matchAll(re)) {
      const d = digitsOf(m[0]);
      if (luhnValid(d) && !TEST_CARDS.has(d)) add('payment card number', m[0], m.index);
    }
  }

  const domains = (cfg && cfg.consumerDomains) || new Set();
  for (const m of s.matchAll(EMAIL)) {
    if (domains.has(m[1].toLowerCase())) add('personal email address', m[0], m.index);
  }

  return found.sort((a, b) => a.index - b.index);
}

module.exports = { findPersonalData, nhsValid, luhnValid, mask, TEST_CARDS };
