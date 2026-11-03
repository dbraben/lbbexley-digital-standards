'use strict';
// The Bexley standards check. One implementation used four ways:
//   - the PostToolUse hook checks each file the assistant saves
//   - the Stop hook checks everything changed before the assistant can finish
//   - lbbexley-check.js checks files from the command line (npm run check)
//   - the GitHub workflow checks every pull request, whatever tool wrote the code
//
// Rules are deliberately mechanical: anything that needs judgement belongs to
// the review skill, the reviewer agents and the end-of-run check.
// Every finding must be fixed, or suppressed with a written reason.

const fs = require('fs');
const path = require('path');
const { findPersonalData } = require('./personal-data');
const { normHex } = require('./config');
const { contrast, fade } = require('./colour');

const TEXT_EXT = new Set([
  '.md', '.txt', '.csv', '.tsv', '.json', '.yaml', '.yml', '.xml',
  '.html', '.htm', '.liquid', '.css', '.js', '.ts', '.ps1', '.sql', '.fx',
]);
const SKIP_DIRS = new Set(['node_modules', '.git', 'bin', 'obj', 'dist', '.vs', '.lbbexley-standards', 'test-results', 'playwright-report', '.auth']);
const BUILD_KINDS = new Set(['canvas', 'agent', 'html', 'flow']);
const MAX_BYTES = 2 * 1024 * 1024;

// Every rule the check can report. Severity is a priority signal only:
// Bexley's definition of done is zero findings of any severity.
const RULES = {
  'personal-data': { severity: 'error', about: 'Real-looking NI, NHS or card numbers, or personal email addresses' },
  'placeholder-text': { severity: 'error', about: 'Lorem ipsum or other placeholder text' },
  emoji: { severity: 'error', about: 'Emoji in user-facing text' },
  'tenant-url': { severity: 'warning', about: 'Environment-specific URLs instead of environment variables' },
  'tracking-script': { severity: 'warning', about: 'Analytics or tracking scripts that need consent' },
  'google-fonts': { severity: 'warning', about: 'Fonts loaded from Google instead of self-hosted Lato' },
  'legacy-colour': { severity: 'warning', about: 'Legacy Bexley colours (Royal, Hyacinth, Geranium)' },
  'canvas-hardcoded-colour': { severity: 'error', about: 'Canvas colour literals outside App.Formulas' },
  'canvas-off-palette': { severity: 'error', about: 'Canvas colours not in the Bexley palette' },
  'canvas-missing-label': { severity: 'error', wcag: '1.1.1, 4.1.2', about: 'Canvas inputs, icons and images without AccessibleLabel' },
  'canvas-font': { severity: 'warning', about: 'Canvas fonts other than Lato' },
  'canvas-tabindex': { severity: 'error', wcag: '2.4.3', about: 'Positive TabIndex values that break the focus order' },
  'canvas-focus-hidden': { severity: 'error', wcag: '2.4.7', about: 'FocusedBorderThickness of 0, which hides keyboard focus' },
  'canvas-target-size': { severity: 'error', wcag: '2.5.8', about: 'Interactive controls smaller than 24 by 24' },
  'canvas-contrast': { severity: 'error', wcag: '1.4.3', about: 'Text and background token pairs below the contrast minimum' },
  'canvas-heading': { severity: 'warning', wcag: '1.3.1, 2.4.6', about: 'Screens without exactly one Heading1' },
  'canvas-text-size': { severity: 'warning', about: 'Text smaller than Bexley small print (13pt)' },
  'canvas-disabled-button': { severity: 'warning', about: 'Buttons disabled until a form is complete' },
  'html-img-alt': { severity: 'error', wcag: '1.1.1', about: 'Images without an alt attribute (pages and email templates)' },
  'html-alt-text': { severity: 'warning', wcag: '1.1.1', about: 'Alt text that starts "image of" or "picture of"' },
  'html-new-tab': { severity: 'warning', wcag: '3.2.5', about: 'Links that open a new tab without saying so' },
  'html-lang': { severity: 'error', wcag: '3.1.1', about: 'Pages without a lang attribute' },
  'html-title': { severity: 'error', wcag: '2.4.2', about: 'Pages without a title' },
  'html-input-label': { severity: 'error', wcag: '1.3.1, 3.3.2, 4.1.2', about: 'Form fields without a label' },
  'html-empty-link': { severity: 'error', wcag: '2.4.4, 4.1.2', about: 'Links and buttons with no accessible name' },
  'html-tabindex': { severity: 'error', wcag: '2.4.3', about: 'Positive tabindex values' },
  'html-autoplay': { severity: 'error', wcag: '1.4.2', about: 'Audio or video that plays automatically' },
  'html-zoom-disabled': { severity: 'error', wcag: '1.4.4', about: 'Viewport settings that stop people zooming' },
  'html-heading-order': { severity: 'warning', wcag: '1.3.1', about: 'Skipped heading levels, or more than one h1 on a page' },
  'css-font': { severity: 'warning', about: 'CSS fonts other than Lato' },
  'css-pure-black': { severity: 'warning', about: 'Pure black instead of Bexley text black' },
  'css-off-palette': { severity: 'warning', about: 'CSS colours not in the Bexley palette' },
  'css-contrast': { severity: 'error', wcag: '1.4.3', about: 'CSS text and background pairs below 4.5:1' },
  'css-focus-hidden': { severity: 'error', wcag: '2.4.7', about: 'Focus styles that remove the outline with no replacement' },
  'card-image-alt': { severity: 'error', wcag: '1.1.1', about: 'Adaptive card images without altText' },
  'flow-error-handling': { severity: 'warning', about: 'Flows with no Catch scope for failures' },
  'flow-hardcoded-mailbox': { severity: 'warning', about: 'Hard-coded @bexley.gov.uk mailboxes in flows' },
  'solution-prefix': { severity: 'error', about: 'Solutions with a publisher prefix other than lbbexley' },
  'solution-default-publisher': { severity: 'error', about: 'Solutions that use the default publisher' },
  'ignore-needs-reason': { severity: 'error', about: 'Suppressions without a written reason' },
  'compliance-incomplete': { severity: 'error', about: 'Template placeholders left in compliance documents (release check)' },
};

const COLOUR_LITERAL = /\bRGBA\s*\([^)]*\)|\bColorValue\s*\(\s*"[^"]*"\s*\)|\bColor\.[A-Za-z]+\b/gi;
const EMOJI = /\p{Extended_Pictographic}/u;
const EMOJI_ALLOWED = new Set(['©', '®', '™']);
const IGNORE_ANY = /lbbexley-ignore(?:(-file)\b:?|:)([^\n]*)/i;
const COMMENT_ONLY = /^\s*(#|\/\/|<!--|\/\*|\*|\{#|\{%|REM\b)/i;
const NEVER_SUPPRESSED_BY_FILE = new Set(['personal-data', 'ignore-needs-reason']);

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

function indentOf(line) {
  return line.match(/^ */)[0].length;
}

function kindOf(file, content) {
  const lower = String(file).replace(/\\/g, '/').toLowerCase();
  const base = path.posix.basename(lower);
  const ext = path.posix.extname(base);
  if (base === '.lbbexleyignore') return 'ignorefile';
  if (/\.pa\.ya?ml$/.test(base)) return 'canvas';
  if (/\.mcs\.ya?ml$/.test(base)) return 'agent';
  if (base === 'solution.xml') return 'solution';
  if (['.html', '.htm', '.liquid'].includes(ext)) return 'html';
  if (ext === '.css') return /\.min\.css$/.test(base) || /bootstrap/.test(base) ? 'vendor' : 'css';
  if (ext === '.js' && /\.min\.js$/.test(base)) return 'vendor';
  if (ext === '.json') {
    if (/(^|\/)workflows\//.test(lower)) return 'flow';
    if (content && /workflowdefinition\.json/i.test(content.slice(0, 4000))) return 'flow';
    return 'text';
  }
  if (TEXT_EXT.has(ext)) return 'text';
  return null;
}

function isCheckable(file) {
  const k = kindOf(file);
  return Boolean(k) && k !== 'vendor';
}

function lineStarts(content) {
  const starts = [0];
  for (let i = 0; i < content.length; i++) if (content[i] === '\n') starts.push(i + 1);
  return starts;
}

function lineAt(starts, index) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= index) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

// ---------- suppressions ----------

// "lbbexley-ignore: rule-a, rule-b because the partner logo needs it"
// Returns { file, rules (Set, or null for every rule), reason }.
function parseIgnore(text) {
  const m = String(text).match(IGNORE_ANY);
  if (!m) return null;
  const tokens = (m[2] || '').replace(/-->|\*\/|#}|%}/g, ' ').trim().split(/[\s,]+/).filter(Boolean);
  const rules = [];
  let i = 0;
  while (i < tokens.length && RULES[tokens[i].toLowerCase()]) rules.push(tokens[i++].toLowerCase());
  const reason = tokens.slice(i).join(' ').replace(/^[-–—:(]+|[)]+$/g, '').trim();
  return { file: Boolean(m[1]), rules: rules.length ? new Set(rules) : null, reason };
}

function hasReason(reason) {
  return (String(reason).match(/[A-Za-z]{2,}/g) || []).length >= 2;
}

function suppressed(lines, lineNo, rule) {
  if (rule === 'ignore-needs-reason') return false;
  for (const ln of [lineNo, lineNo - 1]) {
    const text = lines[ln - 1];
    if (!text) continue;
    if (ln !== lineNo && !COMMENT_ONLY.test(text)) continue;
    const ig = parseIgnore(text);
    if (!ig || ig.file) continue;
    if (!ig.rules || ig.rules.has(rule)) return true;
  }
  return false;
}

function checkSuppressionReasons(r) {
  r.lines.forEach((text, i) => {
    const ig = parseIgnore(text);
    if (ig && !hasReason(ig.reason)) {
      r.add('ignore-needs-reason', 'error',
        'Suppression without a reason: say why the rule doesn\'t apply here, for example "lbbexley-ignore: canvas-font partner logo uses the partner\'s font".',
        { line: i + 1 });
    }
  });
}

// ---------- shared rules ----------

function checkPersonalData(r, content, cfg) {
  for (const f of findPersonalData(content, cfg)) {
    r.add('personal-data', 'error',
      `Looks like a real ${f.kind} (${f.masked}). Use fictional test data (data-protection skill, test-data.md).`,
      { index: f.index });
  }
}

function checkPlaceholderAndEmoji(r, content, kind) {
  for (const m of content.matchAll(/lorem ipsum/gi)) {
    r.add('placeholder-text', 'error', 'Placeholder text (lorem ipsum): write the real content in plain English.', { index: m.index });
  }
  if (!BUILD_KINDS.has(kind)) return;
  r.lines.forEach((line, i) => {
    for (const ch of line) {
      if (EMOJI.test(ch) && !EMOJI_ALLOWED.has(ch)) {
        r.add('emoji', 'error', 'Emoji in user-facing text: remove it (content-style skill).', { line: i + 1 });
        break;
      }
    }
  });
}

function checkTenantUrls(r, content, cfg) {
  const hosts = (cfg.tenantHosts || []).map(escapeRe).join('|');
  if (!hosts) return;
  const re = new RegExp(`https?://[A-Za-z0-9.-]*\\.(?:${hosts})\\b[^\\s"'<>)]*`, 'gi');
  for (const m of content.matchAll(re)) {
    r.add('tenant-url', 'warning',
      `Environment-specific URL ${m[0]}: use an environment variable (or a relative link) so it works in dev, test and production.`,
      { index: m.index });
  }
}

function checkThirdParty(r, content, cfg) {
  for (const host of cfg.trackingHosts || []) {
    const m = content.match(new RegExp(escapeRe(host), 'i'));
    if (m) {
      r.add('tracking-script', 'warning',
        `${host} is analytics or tracking. Under PECR it needs consent unless an exception applies: check the data-protection skill (cookies.md) first.`,
        { index: m.index });
    }
  }
  const gf = content.match(/fonts\.(googleapis|gstatic)\.com/i);
  if (gf) {
    r.add('google-fonts', 'warning',
      'Loading fonts from Google sends visitors\' IP addresses to a third party: self-host Lato as web files instead.',
      { index: gf.index });
  }
}

function paletteMessage(hex, cfg, literal) {
  const legacy = cfg.legacyHexes.get(hex);
  if (legacy) return ['warning', `${literal} is the legacy ${legacy} colour: reference only, don't use it in new work.`];
  if (!cfg.paletteHexes.has(hex)) return ['error', `${literal} isn't in the Bexley palette (brand skill).`];
  return null;
}

function ratioText(n) {
  return `${(Math.floor(n * 100) / 100).toFixed(2)}:1`;
}

// Finds the {...} object around an index in JSON-like text.
function enclosingObject(text, index) {
  let depth = 0;
  let start = -1;
  for (let i = index; i >= 0; i--) {
    const c = text[i];
    if (c === '}') depth++;
    else if (c === '{') {
      if (depth === 0) {
        start = i;
        break;
      }
      depth--;
    }
  }
  if (start < 0) return null;
  depth = 0;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

// Adaptive card images need altText, in JSON, in JSON inside flows and agent
// files, and in YAML card definitions.
function checkCardImages(r, content) {
  if (!/AdaptiveCard/i.test(content)) return;
  for (const m of content.matchAll(/\\?"type\\?"\s*:\s*\\?"Image\\?"/g)) {
    const obj = enclosingObject(content, m.index);
    if (obj && !/\\?"altText\\?"\s*:\s*\\?"\s*[^"\\\s]/.test(obj)) {
      r.add('card-image-alt', 'error', 'Adaptive card image without altText: describe what it shows, or use an empty altText only if it is decorative.', { index: m.index });
    }
  }
  // YAML cards: the image's own mapping (one list item) must have altText.
  const keyIndent = line => line.replace(/^(\s*)-\s+/, '$1  ').search(/\S/);
  const dashAt = line => {
    const d = line.match(/^(\s*)-\s+/);
    return d ? d[1].length : -1;
  };
  r.lines.forEach((text, i) => {
    if (!/^\s*(?:-\s+)?type:\s*["']?Image["']?\s*$/.test(text)) return;
    const ind = keyIndent(text);
    let found = false;
    if (dashAt(text) < 0) {
      for (let j = i - 1; j >= 0; j--) {
        const t = r.lines[j];
        if (!t.trim()) continue;
        if (keyIndent(t) < ind) break;
        if (keyIndent(t) === ind && /^\s*(?:-\s+)?altText:\s*\S/.test(t)) found = true;
        if (dashAt(t) >= 0 && dashAt(t) < ind) break;
      }
    }
    for (let j = i + 1; j < r.lines.length && !found; j++) {
      const t = r.lines[j];
      if (!t.trim()) continue;
      if (keyIndent(t) < ind || (dashAt(t) >= 0 && dashAt(t) < ind)) break;
      if (keyIndent(t) === ind && /^\s*altText:\s*\S/.test(t)) found = true;
    }
    if (!found) r.add('card-image-alt', 'error', 'Adaptive card image without altText: describe what it shows.', { line: i + 1 });
  });
}

// ---------- canvas apps ----------

function parseCanvas(lines) {
  const controls = [];
  lines.forEach((text, i) => {
    const m = text.match(/^(\s*)Control:\s*["']?([^"'\s#]+)/);
    if (!m) return;
    const ind = m[1].length;
    const type = m[2].replace(/^classic\//i, '').split('@')[0].toLowerCase();
    let name = 'A control';
    let start = i;
    for (let j = i - 1; j >= 0; j--) {
      const t = lines[j];
      if (!t.trim() || /^\s*#/.test(t)) continue;
      start = j;
      if (indentOf(t) < ind) {
        const nm = t.match(/^\s*-?\s*["']?([^:"']+?)["']?:\s*$/);
        if (nm) name = nm[1].trim();
        break;
      }
    }
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      const t = lines[j];
      if (!t.trim() || /^\s*#/.test(t)) continue;
      if (indentOf(t) < ind) {
        end = j;
        break;
      }
    }
    const props = new Map();
    for (let j = start + 1; j < end; j++) {
      if (indentOf(lines[j]) !== ind || !/^\s*Properties:\s*$/.test(lines[j])) continue;
      let propInd = null;
      for (let k = j + 1; k < end; k++) {
        const p = lines[k];
        if (!p.trim() || /^\s*#/.test(p)) continue;
        const pi = indentOf(p);
        if (pi <= ind) break;
        if (propInd === null) propInd = pi;
        if (pi !== propInd) continue;
        const pm = p.match(/^\s*([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
        if (pm) props.set(pm[1], { value: pm[2].trim(), line: k + 1 });
      }
      break;
    }
    controls.push({ name, type, line: i + 1, indent: ind, start, end, props });
  });

  const screens = [];
  const root = lines.findIndex(l => /^Screens:\s*$/.test(l));
  if (root >= 0) {
    for (let i = root + 1; i < lines.length; i++) {
      const t = lines[i];
      if (!t.trim() || /^\s*#/.test(t)) continue;
      if (indentOf(t) === 0) break;
      const sm = t.match(/^ {2}["']?([^\s#"'][^:"']*?)["']?:\s*$/);
      if (sm) screens.push({ name: sm[1], line: i + 1, start: i, end: lines.length });
    }
    for (let s = 0; s < screens.length; s++) {
      if (s + 1 < screens.length) screens[s].end = screens[s + 1].start;
      else {
        for (let j = screens[s].start + 1; j < lines.length; j++) {
          if (lines[j].trim() && indentOf(lines[j]) === 0) {
            screens[s].end = j;
            break;
          }
        }
      }
    }
    // The screen's own Fill: the background behind everything on it.
    for (const sc of screens) {
      for (let j = sc.start + 1; j < sc.end; j++) {
        if (indentOf(lines[j]) !== 4 || !/^\s*Properties:\s*$/.test(lines[j])) continue;
        for (let k = j + 1; k < sc.end; k++) {
          const t = lines[k];
          if (!t.trim() || /^\s*#/.test(t)) continue;
          if (indentOf(t) <= 4) break;
          const fm = indentOf(t) === 6 && t.match(/^\s*Fill:\s*(.*)$/);
          if (fm) sc.fill = { value: fm[1].trim(), line: k + 1 };
        }
        break;
      }
    }
  }
  return { controls, screens };
}

function numberValue(v) {
  const m = String(v || '').match(/^=\s*(-?\d+(?:\.\d+)?)\s*$/);
  return m ? Number(m[1]) : null;
}

function resolveCanvasColour(v, cfg) {
  const e = String(v || '').replace(/^=\s*/, '').trim();
  let m = e.match(/^(Bexley[A-Za-z0-9]+)$/);
  if (m) return cfg.palette[m[1]] ? normHex(cfg.palette[m[1]]) : null;
  m = e.match(/^ColorFade\(\s*(Bexley[A-Za-z0-9]+)\s*,\s*(-?\d+(?:\.\d+)?)\s*(%?)\s*\)$/);
  if (m && cfg.palette[m[1]]) return fade(normHex(cfg.palette[m[1]]), Number(m[2]) / (m[3] ? 100 : 1));
  m = e.match(/^ColorValue\(\s*"(#[0-9A-Fa-f]{3,8})"\s*\)$/);
  if (m) return normHex(m[1]);
  m = e.match(/^RGBA\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*1(?:\.0+)?\s*\)$/i);
  if (m) return '#' + [m[1], m[2], m[3]].map(n => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();
  return null;
}

function isTransparentColour(v) {
  const e = String(v || '').replace(/^=\s*/, '').trim();
  return /^Color\.Transparent$/i.test(e) || /^RGBA\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0(?:\.0+)?%?\s*\)$/i.test(e);
}

function resolveCanvasSize(v, cfg) {
  const n = numberValue(v);
  if (n !== null) return n;
  const m = String(v || '').replace(/^=\s*/, '').trim().match(/^(Bexley[A-Za-z0-9]+)$/);
  return m && cfg.canvasSizes && cfg.canvasSizes[m[1]] ? cfg.canvasSizes[m[1]] : null;
}

const INTERACTIVE = new Set(['button', 'textinput', 'dropdown', 'combobox', 'datepicker', 'toggle', 'checkbox', 'radio', 'radiogroup', 'slider', 'rating', 'listbox', 'numberinput']);
const TEXT_CONTROLS = new Set(['label', 'text', 'button', 'textinput', 'dropdown', 'combobox', 'datepicker', 'numberinput']);
// Controls with no background of their own unless Fill is set: their text
// sits on whatever is behind them.
const SEE_THROUGH = new Set(['label', 'text']);

function checkCanvas(r, content, cfg) {
  const { lines } = r;

  // Named formulas (App.Formulas) are where tokens are defined: colour values
  // are allowed there but must come from the palette.
  const inFormulas = new Array(lines.length).fill(false);
  lines.forEach((line, i) => {
    const m = line.match(/^(\s*)Formulas:\s*(.*)$/);
    if (!m) return;
    inFormulas[i] = true;
    const rest = m[2].trim();
    if (rest === '' || /^[|>]/.test(rest)) {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() && indentOf(lines[j]) <= m[1].length) break;
        inFormulas[j] = true;
      }
    }
  });

  lines.forEach((text, i) => {
    if (/^\s*#/.test(text)) return;
    const line = i + 1;
    if (inFormulas[i]) {
      for (const m of text.matchAll(/ColorValue\s*\(\s*"(#[0-9A-Fa-f]{3,8})"\s*\)/g)) {
        const res = paletteMessage(normHex(m[1]), cfg, m[0]);
        if (res) r.add(res[0] === 'error' ? 'canvas-off-palette' : 'legacy-colour', res[0], res[1], { line });
      }
      for (const m of text.matchAll(/RGBA\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)%?\s*\)/gi)) {
        if (Number(m[4]) === 0) continue;
        const hex = '#' + [m[1], m[2], m[3]].map(n => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();
        const res = paletteMessage(hex, cfg, m[0]);
        if (res) r.add(res[0] === 'error' ? 'canvas-off-palette' : 'legacy-colour', res[0], res[1], { line });
      }
      return;
    }
    for (const m of text.matchAll(COLOUR_LITERAL)) {
      const lit = m[0];
      if (/^Color\.Transparent$/i.test(lit)) continue;
      if (/^RGBA\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0(?:\.0+)?%?\s*\)$/i.test(lit)) continue;
      r.add('canvas-hardcoded-colour', 'error',
        `Hard-coded colour ${lit}: use a Bexley token such as BexleyTextBlack or BexleyFuchsia (brand skill, tokens-canvas.md).`,
        { line });
    }
    const f = text.match(/^\s*Font:\s*=\s*(.+?)\s*$/);
    if (f) {
      const v = f[1];
      const bad = (/^Font\./i.test(v) && !/^Font\.'?Lato/i.test(v)) || (/^"/.test(v) && !/Lato/i.test(v));
      if (bad) r.add('canvas-font', 'warning', `Font ${v}: Bexley uses Lato only. Set Font to BexleyFont.`, { line });
    }
  });

  const { controls, screens } = parseCanvas(lines);
  const labelled = new Set(cfg.labelledControls || []);

  // What's behind a control's text when its own background is transparent (or,
  // for labels, not set): the nearest container with a fill, then the screen.
  // Returns null when that can't be worked out, so nothing is guessed.
  const behind = c => {
    const ancestors = controls
      .filter(k => k.start < c.start && c.start < k.end && k.indent < c.indent)
      .sort((x, y) => y.start - x.start);
    for (const k of ancestors) {
      const f = k.props.get('Fill');
      if (!f || isTransparentColour(f.value)) continue;
      const hex = resolveCanvasColour(f.value, cfg);
      return hex ? { hex, where: `${k.name}'s Fill` } : null;
    }
    const sc = screens.find(x => x.start < c.start && c.start < x.end);
    if (sc && sc.fill && !isTransparentColour(sc.fill.value)) {
      const hex = resolveCanvasColour(sc.fill.value, cfg);
      return hex ? { hex, where: `${sc.name}'s Fill` } : null;
    }
    return null;
  };
  const background = (c, bgName) => {
    const b = c.props.get(bgName);
    if (b && !isTransparentColour(b.value)) {
      const hex = resolveCanvasColour(b.value, cfg);
      return hex ? { hex, where: bgName } : null;
    }
    if (!b && !(bgName === 'Fill' && SEE_THROUGH.has(c.type))) return null;
    const found = behind(c);
    if (!found) return null;
    return { hex: found.hex, where: `${found.where} (${bgName} is ${b ? 'transparent' : 'not set'})` };
  };

  for (const c of controls) {
    const p = name => c.props.get(name);

    if (labelled.has(c.type) && !p('AccessibleLabel')) {
      r.add('canvas-missing-label', 'error',
        `${c.name} (${c.type}) has no AccessibleLabel. Inputs need a label that makes sense on its own; images and icons need alt text, or AccessibleLabel: ="" if purely decorative.`,
        { line: c.line });
    }

    const tab = p('TabIndex');
    if (tab && numberValue(tab.value) > 0) {
      r.add('canvas-tabindex', 'error', `${c.name} has TabIndex ${numberValue(tab.value)}: use 0 for interactive controls and -1 for everything else, and order controls with containers.`, { line: tab.line });
    }

    const focus = p('FocusedBorderThickness');
    if (focus && numberValue(focus.value) === 0) {
      r.add('canvas-focus-hidden', 'error', `${c.name} hides keyboard focus (FocusedBorderThickness 0): use BexleyFocusThickness.`, { line: focus.line });
    }

    const actionable = INTERACTIVE.has(c.type) || (['icon', 'image', 'label'].includes(c.type) && p('OnSelect'));
    if (actionable) {
      for (const dim of ['Height', 'Width']) {
        const d = p(dim);
        const n = d ? numberValue(d.value) : null;
        if (n !== null && n < 24) {
          r.add('canvas-target-size', 'error', `${c.name} is ${n} ${dim === 'Height' ? 'high' : 'wide'}: interactive controls must be at least 24 by 24 (use BexleyTargetHeight, 44, for height).`, { line: d.line });
        }
      }
    }

    const size = p('Size');
    const sizeN = size ? numberValue(size.value) : null;
    if (sizeN !== null && sizeN < 13) {
      r.add('canvas-text-size', 'warning', `${c.name} uses ${sizeN}pt text: Bexley's smallest size is 13pt (BexleySizeSmall).`, { line: size.line });
    }

    if (TEXT_CONTROLS.has(c.type)) {
      const pt = size ? resolveCanvasSize(size.value, cfg) : null;
      const bold = /FontWeight\.(Bold|Semibold|Black)/i.test((p('FontWeight') || {}).value || '');
      const large = pt !== null && (pt >= 18 || (pt >= 14 && bold));
      const min = large ? 3 : 4.5;
      for (const [fg, bg] of [['Color', 'Fill'], ['HoverColor', 'HoverFill'], ['PressedColor', 'PressedFill']]) {
        const a = p(fg);
        if (!a) continue;
        const ah = resolveCanvasColour(a.value, cfg);
        const back = ah ? background(c, bg) : null;
        if (!back) continue;
        const ratio = contrast(ah, back.hex);
        if (ratio !== null && ratio < min) {
          r.add('canvas-contrast', 'error', `${c.name}: ${fg} on ${back.where} is ${ratioText(ratio)}, below the ${min}:1 minimum for ${large ? 'large' : 'normal'} text (WCAG 1.4.3).`, { line: a.line });
        }
      }
    }

    if (c.type === 'button') {
      const dm = p('DisplayMode');
      if (dm && /DisplayMode\.Disabled/.test(dm.value) && /IsBlank|IsEmpty|Len\s*\(/.test(dm.value)) {
        r.add('canvas-disabled-button', 'warning', `${c.name} is disabled until the form is complete: let people press it and show what to fix (accessibility skill, canvas.md).`, { line: dm.line });
      }
    }
  }

  for (const s of screens) {
    const inScreen = controls.filter(c => c.start >= s.start && c.line - 1 < s.end);
    if (!inScreen.some(c => ['label', 'text'].includes(c.type))) continue;
    const h1 = inScreen.filter(c => /TextRole\.Heading1\b/.test((c.props.get('Role') || {}).value || ''));
    if (h1.length !== 1) {
      r.add('canvas-heading', 'warning',
        h1.length ? `${s.name} has ${h1.length} Heading1 labels: use exactly one, then Heading2 to Heading4 in order.` : `${s.name} has no heading: give its main heading label Role: =TextRole.Heading1.`,
        { line: h1.length ? h1[1].props.get('Role').line : s.line });
    }
  }
}

// ---------- web: CSS and HTML ----------

function cssVarHex(name, cfg) {
  if (!cfg._cssVars) {
    cfg._cssVars = new Map();
    for (const [token, hex] of Object.entries(cfg.palette || {})) {
      cfg._cssVars.set('--' + token.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(), normHex(hex));
    }
  }
  return cfg._cssVars.get(name) || null;
}

function resolveCssColour(val, cfg) {
  const v = String(val || '');
  const hex = v.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
  if (hex) return normHex(hex[0]);
  const vm = v.match(/var\(\s*(--[a-z0-9-]+)/i);
  if (vm) return cssVarHex(vm[1].toLowerCase(), cfg);
  if (/^\s*white\s*$/i.test(v)) return '#FFFFFF';
  if (/^\s*black\s*$/i.test(v)) return '#000000';
  return null;
}

function checkCssText(r, css, offset, cfg) {
  const DECL = /([a-zA-Z-]+)\s*:\s*([^;{}]+)/g;
  for (const d of css.matchAll(DECL)) {
    const prop = d[1].toLowerCase();
    const val = d[2];
    const valIndex = offset + d.index + d[0].lastIndexOf(val);
    if (prop === 'font-family') {
      if (!/lato/i.test(val) && !/^\s*(inherit|initial|unset|revert|var\()/i.test(val) && !/(icon|awesome|glyph|monospace|consolas|courier)/i.test(val)) {
        r.add('css-font', 'warning', `font-family: ${val.trim()}: Bexley uses Lato only (var(--bexley-font)).`, { index: valIndex });
      }
      continue;
    }
    for (const h of val.matchAll(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
      const hex = normHex(h[0]);
      const index = valIndex + h.index;
      if (hex === '#000000') {
        r.add('css-pure-black', 'warning', 'Pure black: Bexley text black is #0B0C0C (var(--bexley-text-black)).', { index });
      } else if (hex !== '#FFFFFF') {
        const res = paletteMessage(hex, cfg, h[0]);
        if (res) r.add(res[0] === 'error' ? 'css-off-palette' : 'legacy-colour', 'warning', `${res[1]} Use a --bexley-* variable from tokens.css.`, { index });
      }
    }
  }

  for (const b of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = b[1].trim();
    const body = b[2];
    const decl = {};
    for (const d of body.matchAll(/([a-zA-Z-]+)\s*:\s*([^;{}]+)/g)) decl[d[1].toLowerCase()] = d[2].trim();
    const at = offset + b.index + b[0].indexOf('{');
    const fg = decl.color && resolveCssColour(decl.color, cfg);
    const bgVal = decl['background-color'] || decl.background;
    const bg = bgVal && !/transparent|none|inherit|initial|url\(/i.test(bgVal) ? resolveCssColour(bgVal, cfg) : null;
    if (fg && bg) {
      const ratio = contrast(fg, bg);
      if (ratio !== null && ratio < 4.5) {
        r.add('css-contrast', 'error', `${selector}: text ${decl.color} on ${bgVal} is ${ratioText(ratio)}, below 4.5:1 (WCAG 1.4.3).`, { index: at });
      }
    }
    if (/:focus/.test(selector)) {
      const outlineOff = /^(none|0)(\s|$)/i.test(decl.outline || '') || /^none$/i.test(decl['outline-style'] || '') || /^0(px)?$/i.test(decl['outline-width'] || '');
      const replaced = decl['box-shadow'] || decl.border || decl['border-color'] || decl['background-color'] || decl.background || decl['text-decoration'];
      if (outlineOff && !replaced) {
        r.add('css-focus-hidden', 'error', `${selector} removes the focus outline without a replacement: use the Bexley focus style (yellow with a black bar).`, { index: at });
      }
    }
  }
}

function accessibleName(attrs, inner) {
  if (/\baria-label(ledby)?\s*=\s*["']\s*[^"'\s]/i.test(attrs) || /\btitle\s*=\s*["']\s*[^"'\s]/i.test(attrs)) return true;
  const text = inner.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
  if (text) return true;
  if (/<img\b[^>]*\balt\s*=\s*["']\s*[^"'\s]/i.test(inner)) return true;
  if (/<svg\b[\s\S]*?(<title>\s*[^<\s]|aria-label\s*=\s*["']\s*[^"'\s])/i.test(inner)) return true;
  return false;
}

function checkHtml(r, content, cfg, { email = false } = {}) {
  for (const m of content.matchAll(/<img\b[^>]*>/gi)) {
    const alt = m[0].match(/\balt\s*=\s*(?:\\?"([^"\\]*)\\?"|'([^']*)'|([^\s>]+))/i);
    if (!alt) {
      r.add('html-img-alt', 'error', `Image has no alt attribute: describe what it means, or use alt="" if it is decorative${email ? ' (email template in a flow)' : ''}.`, { index: m.index });
    } else {
      const v = (alt[1] ?? alt[2] ?? alt[3] ?? '').trim();
      if (/^(an? )?(image|picture|photo|photograph|graphic|icon) of\b/i.test(v)) {
        r.add('html-alt-text', 'warning', `Alt text "${v.slice(0, 40)}": describe the meaning, without "image of" or "picture of".`, { index: m.index });
      }
    }
  }
  if (email) return;

  for (const m of content.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    if (/\btarget\s*=\s*["']?_blank/i.test(m[1])) {
      const aria = m[1].match(/aria-label\s*=\s*"([^"]*)"/i);
      const text = m[2].replace(/<[^>]+>/g, ' ') + ' ' + (aria ? aria[1] : '');
      if (!/new (tab|window)/i.test(text)) {
        r.add('html-new-tab', 'warning', 'Link opens a new tab without saying so: add "(opens in new tab)" to the link text, or open it in the same tab.', { index: m.index });
      }
    }
    if (/\bhref\s*=/i.test(m[1]) && !accessibleName(m[1], m[2])) {
      r.add('html-empty-link', 'error', 'Link has no text a screen reader can announce: add link text, or alt text on the image inside it.', { index: m.index });
    }
  }
  for (const m of content.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    if (!accessibleName(m[1], m[2])) {
      r.add('html-empty-link', 'error', 'Button has no text a screen reader can announce: add button text or an aria-label.', { index: m.index });
    }
  }

  const htmlTag = content.match(/<html\b[^>]*>/i);
  if (htmlTag && !/\blang\s*=/i.test(htmlTag[0])) {
    r.add('html-lang', 'error', 'The <html> element has no lang attribute: use lang="en-GB".', { index: htmlTag.index });
  }
  const head = content.match(/<head\b[^>]*>/i);
  if (head && !/<title\b[^>]*>\s*[^<\s][^<]*<\/title>/i.test(content)) {
    r.add('html-title', 'error', 'The page has no title: use "Page name – Service name – London Borough of Bexley".', { index: head.index });
  }

  for (const m of content.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)) {
    const tag = m[1].toLowerCase();
    const attrs = m[2];
    if (tag === 'input' && /\btype\s*=\s*["']?(hidden|submit|button|reset|image)\b/i.test(attrs)) continue;
    if (/\baria-label(ledby)?\s*=\s*["']\s*[^"'\s]/i.test(attrs) || /\btitle\s*=\s*["']\s*[^"'\s]/i.test(attrs)) continue;
    const id = attrs.match(/\bid\s*=\s*["']([^"']+)["']/i);
    if (id && new RegExp(`<label\\b[^>]*\\bfor\\s*=\\s*["']${escapeRe(id[1])}["']`, 'i').test(content)) continue;
    const before = content.slice(0, m.index);
    if (before.lastIndexOf('<label') > before.lastIndexOf('</label>')) continue;
    r.add('html-input-label', 'error', `A <${tag}> has no label: add a <label for="..."> that says what to enter.`, { index: m.index });
  }

  for (const m of content.matchAll(/\btabindex\s*=\s*["']?([1-9]\d*)/gi)) {
    r.add('html-tabindex', 'error', `tabindex="${m[1]}" changes the focus order: use 0, or -1 for elements that shouldn't be tabbed to.`, { index: m.index });
  }
  for (const m of content.matchAll(/<(video|audio)\b[^>]*\bautoplay\b/gi)) {
    r.add('html-autoplay', 'error', `<${m[1].toLowerCase()}> plays automatically: let people choose to play it.`, { index: m.index });
  }
  for (const m of content.matchAll(/<meta\b[^>]*name\s*=\s*["']viewport["'][^>]*>/gi)) {
    if (/user-scalable\s*=\s*(no|0)\b/i.test(m[0]) || /maximum-scale\s*=\s*(0?\.\d+|1(\.0+)?)\b/i.test(m[0])) {
      r.add('html-zoom-disabled', 'error', 'The viewport setting stops people zooming: remove user-scalable=no and maximum-scale.', { index: m.index });
    }
  }

  let prev = null;
  let h1s = 0;
  for (const m of content.matchAll(/<h([1-6])\b/gi)) {
    const level = Number(m[1]);
    if (level === 1) h1s += 1;
    if (prev !== null && level > prev + 1) {
      r.add('html-heading-order', 'warning', `Heading jumps from h${prev} to h${level}: don't skip levels.`, { index: m.index });
    }
    if (level === 1 && h1s === 2 && htmlTag) {
      r.add('html-heading-order', 'warning', 'More than one h1 on the page: use one h1, then h2 to h4.', { index: m.index });
    }
    prev = level;
  }

  for (const m of content.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    checkCssText(r, m[1], m.index + m[0].indexOf(m[1]), cfg);
  }
  for (const m of content.matchAll(/\bstyle\s*=\s*"([^"]*)"/gi)) {
    checkCssText(r, m[1], m.index + m[0].indexOf(m[1]), cfg);
  }
}

// ---------- flows, solutions, ignore files, compliance ----------

function checkFlow(r, content, cfg) {
  let json;
  try {
    json = JSON.parse(content);
  } catch {
    return;
  }
  const def = (json.properties && json.properties.definition) || json.definition;
  if (!def || !def.actions) return;
  let count = 0;
  let handled = false;
  const walk = actions => {
    for (const a of Object.values(actions || {})) {
      if (!a || typeof a !== 'object') continue;
      count += 1;
      for (const v of Object.values(a.runAfter || {})) {
        if (Array.isArray(v) && v.some(s => /failed|timedout/i.test(String(s)))) handled = true;
      }
      walk(a.actions);
      if (a.else) walk(a.else.actions);
      if (a.cases) for (const c of Object.values(a.cases)) walk(c && c.actions);
      if (a.default) walk(a.default.actions);
    }
  };
  walk(def.actions);
  if (count >= 3 && !handled) {
    r.add('flow-error-handling', 'warning',
      'No error handling: put the main steps in a Try scope, add a Catch scope set to run after Failed or Timed out, and notify the support mailbox (power-automate skill).',
      { line: 1 });
  }
  for (const m of content.matchAll(/"[^"\n]*\b[A-Za-z0-9._%+-]+@bexley\.gov\.uk\b[^"\n]*"/gi)) {
    r.add('flow-hardcoded-mailbox', 'warning',
      'Hard-coded @bexley.gov.uk address: use an environment variable so the flow works in every environment.',
      { index: m.index });
  }
  checkHtml(r, content, cfg, { email: true });
}

function checkSolution(r, content, cfg) {
  const m = content.match(/<CustomizationPrefix>\s*([^<\s]+)\s*<\/CustomizationPrefix>/i);
  if (m && m[1].toLowerCase() !== String(cfg.prefix).toLowerCase()) {
    r.add('solution-prefix', 'error', `Publisher prefix is "${m[1]}": Bexley solutions use the "${cfg.prefix}" publisher.`, { index: m.index });
  }
  const p = content.match(/<Publisher>[\s\S]*?<UniqueName>\s*([^<\s]+)\s*<\/UniqueName>/i);
  if (p && /^DefaultPublisher/i.test(p[1])) {
    r.add('solution-default-publisher', 'error', `This solution uses the default publisher: use the Bexley publisher (prefix ${cfg.prefix}).`, { index: p.index });
  }
}

function checkIgnoreFile(r) {
  r.lines.forEach((raw, i) => {
    const [entry, comment = ''] = raw.split('#');
    if (!entry.trim()) return;
    if (!hasReason(comment)) {
      r.add('ignore-needs-reason', 'error', 'Ignore entry without a reason: add "# why this is safe to skip" at the end of the line.', { line: i + 1 });
    }
  });
}

function checkCompliance(r, file, content) {
  const rel = String(file).replace(/\\/g, '/');
  if (!/(^|\/)docs\/compliance\/[^/]+\.md$/i.test(rel) && !/(^|\/)(AGENTS|README)\.md$/i.test(rel)) return;
  for (const m of content.matchAll(/\{\{[^}\n]*\}\}/g)) {
    const what = m[0].replace(/\s/g, '') === '{{}}' ? 'An empty answer ({{}})' : `Template placeholder ${m[0]}`;
    r.add('compliance-incomplete', 'error', `${what} still needs a real answer before release.`, { index: m.index });
  }
}

// ---------- driver ----------

function checkContent(file, content, cfg, opts = {}) {
  const kind = kindOf(file, content);
  if (!kind || kind === 'vendor') return [];
  const lines = content.split(/\r?\n/);
  const fileIgnore = lines.slice(0, 10).map(parseIgnore).find(ig => ig && ig.file) || null;
  const starts = lineStarts(content);
  const ignoreRules = opts.ignoreRules || new Set();
  const findings = [];
  const seen = new Set();
  const r = {
    lines,
    add(rule, severity, message, at) {
      if (rule !== 'ignore-needs-reason') {
        if (ignoreRules.has(rule) || (ignoreRules.has('*') && !NEVER_SUPPRESSED_BY_FILE.has(rule))) return;
        if (fileIgnore && !NEVER_SUPPRESSED_BY_FILE.has(rule) && (!fileIgnore.rules || fileIgnore.rules.has(rule))) return;
      }
      const line = at.line || lineAt(starts, at.index || 0);
      if (suppressed(lines, line, rule)) return;
      const key = `${rule}|${line}|${message}`;
      if (seen.has(key)) return;
      seen.add(key);
      findings.push({ file, line, severity, rule, message });
    },
  };

  checkSuppressionReasons(r);
  if (kind === 'ignorefile') {
    checkIgnoreFile(r);
    return findings;
  }
  checkPersonalData(r, content, cfg);
  if (BUILD_KINDS.has(kind) || /\.csv$/i.test(file)) checkPlaceholderAndEmoji(r, content, kind);
  if (BUILD_KINDS.has(kind)) checkTenantUrls(r, content, cfg);
  if (kind === 'html' || kind === 'css' || /\.js$/i.test(file)) checkThirdParty(r, content, cfg);
  if (kind === 'canvas') checkCanvas(r, content, cfg);
  if (kind === 'html') checkHtml(r, content, cfg);
  if (kind === 'css') checkCssText(r, content, 0, cfg);
  if (kind === 'flow') checkFlow(r, content, cfg);
  if (kind === 'solution') checkSolution(r, content, cfg);
  if (['agent', 'flow', 'text'].includes(kind) && /\.(json|ya?ml)$/i.test(file)) checkCardImages(r, content);
  if (opts.release) checkCompliance(r, file, content);

  return findings.sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule));
}

function checkPath(file, cfg, opts = {}) {
  let st;
  try {
    st = fs.statSync(file);
  } catch {
    return [];
  }
  if (!st.isFile() || st.size > MAX_BYTES) return [];
  const buf = fs.readFileSync(file);
  if (buf.includes(0)) return [];
  return checkContent(opts.displayPath || file, buf.toString('utf8'), cfg, opts);
}

// ---------- files and ignores ----------

function globToRegExp(glob) {
  let g = glob.replace(/\\/g, '/');
  if (g.endsWith('/')) g += '**';
  const anchored = g.startsWith('/');
  if (anchored) g = g.slice(1);
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') {
        i += 1;
        if (g[i + 1] === '/') {
          i += 1;
          re += '(?:.*/)?';
        } else {
          re += '.*';
        }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp('^' + (anchored ? '' : '(?:.*/)?') + re + '$');
}

// .lbbexleyignore at the repo root: "glob [rule,rule]  # reason" per line.
// Without rules, every rule except personal-data is ignored for matching files.
function loadIgnoreFile(root) {
  let text;
  try {
    text = fs.readFileSync(path.join(root, '.lbbexleyignore'), 'utf8');
  } catch {
    return [];
  }
  const entries = [];
  for (const raw of text.split(/\r?\n/)) {
    const [entry, reason = ''] = raw.split('#');
    const line = entry.trim();
    if (!line) continue;
    const [glob, list] = line.split(/\s+/, 2);
    const rules = list ? list.split(',').map(s => s.trim()).filter(Boolean) : ['*'];
    entries.push({ re: globToRegExp(glob), rules: new Set(rules), reason: reason.trim() });
  }
  return entries;
}

function ignoreRulesFor(relPath, entries) {
  const set = new Set();
  const rel = relPath.replace(/\\/g, '/');
  for (const e of entries) if (e.re.test(rel)) for (const r of e.rules) set.add(r);
  return set;
}

function isIgnoredPath(rel, cfg) {
  const p = rel.replace(/\\/g, '/');
  return (cfg.ignorePaths || []).some(prefix => p === prefix.replace(/\/$/, '') || p.startsWith(prefix));
}

function collectFiles(inputs, root, cfg) {
  const out = new Set();
  const walk = abs => {
    let st;
    try {
      st = fs.statSync(abs);
    } catch {
      return;
    }
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    if (rel && !rel.startsWith('..') && isIgnoredPath(st.isDirectory() ? rel + '/' : rel, cfg)) return;
    if (st.isDirectory()) {
      if (abs !== root && SKIP_DIRS.has(path.basename(abs))) return;
      for (const entry of fs.readdirSync(abs)) walk(path.join(abs, entry));
    } else if (st.isFile() && isCheckable(abs)) {
      out.add(abs);
    }
  };
  for (const input of inputs) walk(path.resolve(root, input));
  return [...out];
}

module.exports = {
  RULES,
  kindOf,
  isCheckable,
  checkContent,
  checkPath,
  collectFiles,
  loadIgnoreFile,
  ignoreRulesFor,
  isIgnoredPath,
  globToRegExp,
  parseIgnore,
};
