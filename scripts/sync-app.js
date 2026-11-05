#!/usr/bin/env node
'use strict';
// Brings an app repository in line with this release of the Bexley standards.
//
//   node scripts/sync-app.js --target <app repo>          write the files
//   node scripts/sync-app.js --target <app repo> --check  report drift, exit 1 if any
//
// It owns these paths in the app repository and nothing else, so a
// repository's own skills, agents, rules and hooks are left alone:
//   .github/skills/lbbexley-<skill>/                  skills, adapted for GitHub Copilot
//   .github/agents/lbbexley-*.agent.md                reviewers, plus the plan, build and check agents
//   .github/instructions/lbbexley-*.instructions.md   path rules for Copilot
//   .claude/rules/lbbexley-*.md                       the same path rules for Claude Code
//   .github/hooks/lbbexley.json                       Copilot hooks (preview)
//   .lbbexley/standards/                              the standards check, the hook scripts and
//                                                     the accessibility test runner
//
// The app repository keeps what's its own: tests/accessibility/targets.json
// (the pages and screens to test), package.json, its workflows and its source.
//
// Markdown for Copilot is adapted on the way:
//   - <!-- claude-only --> ... <!-- /claude-only --> blocks are removed
//   - <!-- copilot: text --> comments become plain text
//   - ${CLAUDE_PLUGIN_ROOT} paths point at the copied files
//   - /lbbexley:<skill> commands become /lbbexley-<skill>
//   - links from one skill to another (../<skill>/) follow the lbbexley- prefix
//   - Claude model tiers (opus, sonnet, haiku) become the Copilot model lists
//     in config/standards.json (copilotModels)

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const PLUGIN = path.join(REPO, 'plugins', 'lbbexley');
const SYNC = path.join(REPO, 'sync');
const PREFIX = 'lbbexley-';
const VERSION = JSON.parse(fs.readFileSync(path.join(PLUGIN, '.claude-plugin', 'plugin.json'), 'utf8')).version;
const CONFIG = JSON.parse(fs.readFileSync(path.join(PLUGIN, 'config', 'standards.json'), 'utf8'));
const NOTICE = `<!-- Generated from lbbexley-digital-standards ${VERSION} by scripts/sync-app.js. Don't edit here: change the standards repository and sync again. -->`;
const TIERS = { opus: 'plan', sonnet: 'build', haiku: 'check' };

function parseArgs(argv) {
  const opts = { target: null, check: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--target') opts.target = argv[++i];
    else if (argv[i] === '--check') opts.check = true;
    else if (argv[i] === '--help' || argv[i] === '-h') opts.help = true;
    else throw new Error(`Unknown option ${argv[i]}`);
  }
  if (!opts.help && !opts.target) throw new Error('--target is required');
  return opts;
}

function splitFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { fields: null, body: text };
  const fields = [];
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) fields.push([kv[1], kv[2]]);
    else if (fields.length) fields[fields.length - 1][1] += '\n' + line;
  }
  return { fields, body: text.slice(m[0].length) };
}

function joinFrontmatter(fields, body) {
  if (!fields) return body;
  return `---\n${fields.map(([k, v]) => (v.startsWith('\n') ? `${k}:${v}` : `${k}: ${v}`)).join('\n')}\n---\n${body}`;
}

function modelList(tier) {
  const list = (CONFIG.copilotModels || {})[tier] || [];
  return `[${list.map(m => `'${String(m).replace(/'/g, "''")}'`).join(', ')}]`;
}

// Skill folder names, so links from one skill to another can follow the rename.
const SKILL_NAMES = fs.readdirSync(path.join(PLUGIN, 'skills')).filter(d => fs.statSync(path.join(PLUGIN, 'skills', d)).isDirectory());

function adaptBody(text) {
  return text
    .replace(/\]\(\.\.\/([a-z0-9-]+)\//g, (m, s) => (SKILL_NAMES.includes(s) ? `](../${PREFIX}${s}/` : m))
    .replace(/<!--\s*claude-only\s*-->[\s\S]*?<!--\s*\/claude-only\s*-->\n?/g, '')
    .replace(/<!--\s*copilot:\s*([\s\S]*?)\s*-->/g, '$1')
    .replace(/\$\{CLAUDE_PLUGIN_ROOT\}\/skills\/([a-z0-9-]+)\//g, `.github/skills/${PREFIX}$1/`)
    .replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, '.lbbexley/standards')
    .replace(/lbbexley:([a-z0-9-]+)/g, `${PREFIX}$1`)
    .replace(/\n{3,}/g, '\n\n');
}

function adaptSkillMd(text, skill) {
  const { fields, body } = splitFrontmatter(text);
  const keep = new Set(['name', 'description', 'argument-hint', 'disable-model-invocation', 'user-invocable', 'license']);
  const out = (fields || []).filter(([k]) => keep.has(k)).map(([k, v]) => (k === 'name' ? [k, PREFIX + skill] : [k, v]));
  if (!out.some(([k]) => k === 'name')) out.unshift(['name', PREFIX + skill]);
  return joinFrontmatter(out, `${NOTICE}\n${adaptBody(body)}`);
}

function adaptAgentMd(text, agent) {
  const { fields, body } = splitFrontmatter(text);
  const out = [];
  for (const [k, v] of fields || []) {
    if (k === 'name') out.push([k, PREFIX + agent]);
    else if (k === 'description' || k === 'tools') out.push([k, v]);
    else if (k === 'model' && TIERS[v.trim()]) out.push(['model', modelList(TIERS[v.trim()])]);
  }
  if (!out.some(([k]) => k === 'name')) out.unshift(['name', PREFIX + agent]);
  return joinFrontmatter(out, `${NOTICE}\n${adaptBody(body)}`);
}

function copilotAgent(text) {
  const { fields, body } = splitFrontmatter(text.replace(/\{\{models\.(plan|build|check)\}\}/g, (_, t) => modelList(t)));
  return joinFrontmatter(fields, `${NOTICE}\n${body}`);
}

function ruleParts(text) {
  const { fields, body } = splitFrontmatter(text);
  const map = Object.fromEntries((fields || []).map(([k, v]) => [k, v]));
  const paths = (map.paths || '').split('\n').map(l => l.replace(/^\s*-\s*/, '').replace(/^["']|["']$/g, '').trim()).filter(Boolean);
  return { description: (map.description || '').trim(), paths, body };
}

function claudeRule(text) {
  const { paths, body } = ruleParts(text);
  return `---\npaths:\n${paths.map(p => `  - "${p}"`).join('\n')}\n---\n${NOTICE}\n${body}`;
}

function copilotInstruction(text) {
  const { description, paths, body } = ruleParts(text);
  return `---\ndescription: '${description.replace(/'/g, "''")}'\napplyTo: '${paths.join(',')}'\n---\n${NOTICE}\n${adaptBody(body)}`;
}

function walk(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out);
    else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out.sort();
}

// The complete set of files the app repository should have, as { path: Buffer }.
function expectedFiles() {
  const files = new Map();
  const put = (p, content) => files.set(p, Buffer.isBuffer(content) ? content : Buffer.from(content));

  const skillsDir = path.join(PLUGIN, 'skills');
  for (const skill of fs.readdirSync(skillsDir).sort()) {
    const dir = path.join(skillsDir, skill);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const rel of walk(dir)) {
      const src = path.join(dir, rel);
      const dest = `.github/skills/${PREFIX}${skill}/${rel}`;
      if (rel === 'SKILL.md') put(dest, adaptSkillMd(fs.readFileSync(src, 'utf8'), skill));
      else if (rel.endsWith('.md')) put(dest, adaptBody(fs.readFileSync(src, 'utf8')));
      else put(dest, fs.readFileSync(src));
    }
  }

  for (const f of walk(path.join(PLUGIN, 'agents')).filter(f => f.endsWith('.md'))) {
    const agent = path.basename(f, '.md');
    put(`.github/agents/${PREFIX}${agent}.agent.md`, adaptAgentMd(fs.readFileSync(path.join(PLUGIN, 'agents', f), 'utf8'), agent));
  }
  for (const f of walk(path.join(SYNC, 'copilot', 'agents')).filter(f => f.endsWith('.agent.md'))) {
    put(`.github/agents/${PREFIX}${f}`, copilotAgent(fs.readFileSync(path.join(SYNC, 'copilot', 'agents', f), 'utf8')));
  }

  for (const f of walk(path.join(SYNC, 'rules')).filter(f => f.endsWith('.md'))) {
    const name = path.basename(f, '.md');
    const text = fs.readFileSync(path.join(SYNC, 'rules', f), 'utf8');
    put(`.claude/rules/${PREFIX}${name}.md`, claudeRule(text));
    put(`.github/instructions/${PREFIX}${name}.instructions.md`, copilotInstruction(text));
  }

  put('.github/hooks/lbbexley.json', fs.readFileSync(path.join(SYNC, 'copilot', 'hooks.json')));

  for (const sub of ['scripts', 'config']) {
    for (const rel of walk(path.join(PLUGIN, sub))) {
      put(`.lbbexley/standards/${sub}/${rel}`, fs.readFileSync(path.join(PLUGIN, sub, rel)));
    }
  }
  for (const rel of walk(path.join(SYNC, 'tests'))) {
    put(`.lbbexley/standards/tests/${rel}`, fs.readFileSync(path.join(SYNC, 'tests', rel)));
  }
  put('.lbbexley/standards/README.md', [
    '# Bexley standards scripts',
    '',
    NOTICE,
    '',
    `Version ${VERSION}. Copied here so \`npm run check\`, the accessibility tests, the Copilot hooks and the pull request check all use the same release of the Bexley standards as the Claude Code plugin:`,
    '',
    '- `scripts/` and `config/`: the standards check and the hook scripts',
    '- `tests/accessibility/`: the accessibility test runner (Playwright and axe). The pages and screens it tests are in `tests/accessibility/targets.json` at the root of this repository, which is yours to edit.',
    '',
    'Update them with `npm run standards:update -- <version>`, never by hand.',
    '',
  ].join('\n'));
  return files;
}

// Things in the app repository that predate this release and need a person to
// change them (sync never edits files it doesn't own).
const RUNNER = '.lbbexley/standards/tests/accessibility';
const OLD_RUNNER_FILES = ['a11y.spec.js', 'shared.js', 'playwright.config.js', 'login.js'];

const TRANSCRIPT_CLEAN = 'node .lbbexley/standards/scripts/clean-transcript.js';
const MARKETPLACE = 'lbbexley-digital';

// The release Claude Code installs the Bexley plugin from, if the repository
// pins one: extraKnownMarketplaces in .claude/settings.json.
function readSettings(target) {
  try {
    return JSON.parse(fs.readFileSync(path.join(target, '.claude', 'settings.json'), 'utf8'));
  } catch {
    return null;
  }
}

function marketplacePin(settings) {
  const source = settings && settings.extraKnownMarketplaces && settings.extraKnownMarketplaces[MARKETPLACE] && settings.extraKnownMarketplaces[MARKETPLACE].source;
  if (!source || source.source !== 'github') return { declared: false, ref: null };
  return { declared: true, ref: source.ref || null };
}

// The other places an app repository names a release of the standards: the
// Claude Code plugin's marketplace, and the check on GitHub with the standards
// it checks against. Any other release there means those use different
// standards from these files. A commit SHA in the workflow is left alone.
function pinMismatches(target) {
  const want = `v${VERSION}`;
  const out = [];
  const pin = marketplacePin(readSettings(target));
  if (pin.ref && pin.ref !== want) out.push(`.claude/settings.json installs the Claude Code plugin from ${pin.ref}, not ${want}`);
  let workflow = '';
  try {
    workflow = fs.readFileSync(path.join(target, '.github', 'workflows', 'quality.yml'), 'utf8');
  } catch {
    // No quality workflow: nothing to compare.
  }
  const found = [
    [workflow.match(/standards-check\.yml@(\S+)/), 'runs the check on GitHub from'],
    [workflow.match(/standards-ref:\s*(\S+)/), 'checks against the standards at'],
  ];
  for (const [m, what] of found) {
    const ref = m && m[1].replace(/^['"]|['"]$/g, '');
    if (ref && ref !== want && !/^[0-9a-f]{40}$/i.test(ref)) out.push(`.github/workflows/quality.yml ${what} ${ref}, not ${want}`);
  }
  return out;
}

function migrationNotes(target) {
  const notes = [];
  let app = false;
  try {
    const scripts = JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8')).scripts || {};
    app = true;
    const wanted = {
      'test:a11y': `playwright test --config ${RUNNER}/playwright.config.js`,
      'test:a11y:login': `node ${RUNNER}/login.js`,
    };
    for (const [name, command] of Object.entries(wanted)) {
      if (scripts[name] && !scripts[name].includes(RUNNER)) notes.push(`In package.json, change the "${name}" script to: ${command}`);
    }
    if (!scripts['transcript:clean']) notes.push(`In package.json, add a "transcript:clean" script: ${TRANSCRIPT_CLEAN}`);
  } catch {
    // No package.json, or not JSON: nothing to say.
  }
  const old = OLD_RUNNER_FILES.filter(f => fs.existsSync(path.join(target, 'tests', 'accessibility', f)));
  if (old.length) notes.push(`Delete the old copies of the test runner in tests/accessibility/ (${old.join(', ')}). Keep targets.json: it's yours.`);
  if (app && !fs.existsSync(path.join(target, 'docs', 'discovery', '.gitignore'))) {
    notes.push('Add docs/discovery/.gitignore and docs/discovery/README.md from the app template, so cleaned meeting transcripts are never committed.');
  }
  const settings = readSettings(target);
  const pin = marketplacePin(settings);
  if (pin.declared && !pin.ref) {
    notes.push(`In .claude/settings.json, pin the Bexley marketplace to this release, so Claude Code uses the same standards as the other checks: add "ref": "v${VERSION}" to extraKnownMarketplaces.${MARKETPLACE}.source. Or run npm run standards:update -- v${VERSION} again: from this release, it does that for you and moves the plugin too.`);
  }
  const allow = (settings && settings.permissions && settings.permissions.allow) || [];
  if (settings && !allow.includes('Bash(git commit *)')) {
    notes.push('In .claude/settings.json, add "Bash(git add *)", "Bash(git commit *)" and the PowerShell versions to permissions.allow, so Claude can commit the work for people without asking.');
  }
  if (settings && !(allow.includes('Bash(git push *)') && allow.some(rule => rule.startsWith('Bash(pac solution sync')))) {
    notes.push('In .claude/settings.json, let the assistant build in the dev environment, bring in the latest version, commit and push without asking, as the app template does: add the Dataverse, canvas and Power Automate tools, pac solution sync and clone, pac pages download and upload, and git push to permissions.allow, take git push and pac pages upload out of permissions.ask, and add the deny rules for force pushes.');
  }
  if (settings) {
    const env = settings.env || {};
    const attribution = settings.attribution || {};
    const missing = [];
    if (!allow.some(rule => rule.startsWith('Bash(pac solution add-solution-component'))) missing.push('"Bash(pac solution add-solution-component *)" and the PowerShell version to permissions.allow, so new flows and tables can be added to the solution before the sync');
    if (!['POWER_AUTOMATE', 'POWER_PAGES', 'MODEL_APPS'].every(name => String(env[`POWER_PLATFORM_SKILLS_TELEMETRY_${name}_OPTOUT`] || '') === '1')) missing.push('the env block that turns off the usage telemetry Microsoft\'s Power Automate, Power Pages and Model Apps plugins send by default (POWER_PLATFORM_SKILLS_TELEMETRY_<PLUGIN>_OPTOUT: "1")');
    if (attribution.sessionUrl !== false) missing.push('"sessionUrl": false under attribution, so a commit made from a Remote Control or cloud session carries no session link');
    if (missing.length) notes.push(`In .claude/settings.json, as in the app template, add ${missing.join('; ')}.`);
  }
  try {
    const ignore = fs.readFileSync(path.join(target, '.gitignore'), 'utf8');
    if (app && !/^\*\.vtt$/m.test(ignore)) notes.push('In .gitignore, add *.vtt and *.roles.json, so an original meeting transcript put in the repository by mistake is never committed.');
    if (app && !/^src\/canvas\/\*\*\/\*\.md$/m.test(ignore)) notes.push('In .gitignore, add src/canvas/**/*.md, so the planning notes Microsoft\'s canvas tools write next to each app are never committed.');
  } catch {
    // No .gitignore: nothing to say.
  }
  try {
    const vscode = fs.readFileSync(path.join(target, '.vscode', 'settings.json'), 'utf8');
    if (app && !/chat\.tools\.terminal\.autoApprove/.test(vscode)) notes.push('In .vscode/settings.json, add the app template\'s chat.tools.terminal.autoApprove rules, so Copilot can sync the solution, commit and push without asking, but not force-push or delete.');
    else if (app && !/add-solution-component/.test(vscode)) notes.push('In .vscode/settings.json, change the pac solution rule under chat.tools.terminal.autoApprove to "/^pac solution (sync|clone|add-solution-component)\\\\b/", as in the app template, so Copilot can add flows and tables to the solution without asking.');
  } catch {
    // No VS Code settings: nothing to say.
  }
  try {
    const instructions = fs.readFileSync(path.join(target, '.github', 'copilot-instructions.md'), 'utf8');
    if (app && !/pac solution sync/.test(instructions)) notes.push('Replace .github/copilot-instructions.md with the app template\'s, so Copilot is told to build in the dev environment, sync the solution, and commit and push.');
  } catch {
    // No Copilot instructions: nothing to say.
  }
  try {
    const dependabot = fs.readFileSync(path.join(target, '.github', 'dependabot.yml'), 'utf8');
    if (app && /github-actions/.test(dependabot) && !/lbbexley-digital-standards/.test(dependabot)) notes.push('In .github/dependabot.yml, add the ignore for dbraben/lbbexley-digital-standards under the github-actions entry, as in the app template, so Dependabot doesn\'t offer to move the check on GitHub to a release the rest of the repository isn\'t on.');
  } catch {
    // No Dependabot: nothing to say.
  }
  try {
    const agents = fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8');
    if (app && !/pac solution sync/.test(agents)) notes.push('In AGENTS.md, replace the "How work runs" section, and the "Always" and "Never" lists, with the app template\'s: the work is built in the dev environment, new flows and tables are added to the solution, the latest version is synced into the repository, then committed and pushed, and nothing is deleted or force-pushed.');
    else if (app && !/add-solution-component/.test(agents)) notes.push('In AGENTS.md, replace the "How work runs" section with the app template\'s: new flows and tables are added to the solution with pac solution add-solution-component before the sync.');
  } catch {
    // No AGENTS.md: nothing to say.
  }
  return notes;
}

function printNotes(target) {
  const notes = migrationNotes(target);
  if (!notes.length) return;
  process.stdout.write('To finish moving to this release of the standards, change these yourself:\n');
  for (const n of notes) process.stdout.write(`  - ${n}\n`);
}

// What's in the target now, limited to the paths this script owns.
function currentFiles(target) {
  const files = new Map();
  const add = (rel, abs) => files.set(rel, fs.readFileSync(abs));
  const skills = path.join(target, '.github', 'skills');
  if (fs.existsSync(skills)) {
    for (const d of fs.readdirSync(skills)) {
      const dir = path.join(skills, d);
      if (d.startsWith(PREFIX) && fs.statSync(dir).isDirectory()) for (const rel of walk(dir)) add(`.github/skills/${d}/${rel}`, path.join(dir, rel));
    }
  }
  const flat = [
    ['.github/agents', f => f.startsWith(PREFIX) && f.endsWith('.agent.md')],
    ['.github/instructions', f => f.startsWith(PREFIX) && f.endsWith('.instructions.md')],
    ['.claude/rules', f => f.startsWith(PREFIX) && f.endsWith('.md')],
    ['.github/hooks', f => f === 'lbbexley.json'],
  ];
  for (const [dir, owned] of flat) {
    const abs = path.join(target, dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs)) if (owned(f) && fs.statSync(path.join(abs, f)).isFile()) add(`${dir}/${f}`, path.join(abs, f));
  }
  const vendored = path.join(target, '.lbbexley', 'standards');
  for (const rel of walk(vendored)) add(`.lbbexley/standards/${rel}`, path.join(vendored, rel));
  return files;
}

function diff(expected, current) {
  const missing = [];
  const changed = [];
  const extra = [];
  for (const [p, buf] of expected) {
    if (!current.has(p)) missing.push(p);
    else if (!current.get(p).equals(buf)) changed.push(p);
  }
  for (const p of current.keys()) if (!expected.has(p)) extra.push(p);
  return { missing, changed, extra };
}

function removeEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) removeEmptyDirs(path.join(dir, e.name));
  if (!fs.readdirSync(dir).length) fs.rmdirSync(dir);
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`${e.message}\nUsage: node scripts/sync-app.js --target <app repo> [--check]\n`);
    return 2;
  }
  if (opts.help) {
    process.stdout.write('Usage: node scripts/sync-app.js --target <app repo> [--check]\n');
    return 0;
  }
  const target = path.resolve(opts.target);
  if (!fs.existsSync(target)) {
    process.stderr.write(`Target ${target} does not exist.\n`);
    return 2;
  }

  const expected = expectedFiles();
  const d = diff(expected, currentFiles(target));
  const pins = pinMismatches(target);
  const drift = d.missing.length + d.changed.length + d.extra.length + pins.length;

  if (opts.check) {
    printNotes(target);
    if (!drift) {
      process.stdout.write(`The Bexley files are up to date with standards ${VERSION}.\n`);
      return 0;
    }
    process.stdout.write(`The Bexley files differ from standards ${VERSION}:\n`);
    for (const p of d.missing) process.stdout.write(`  missing  ${p}\n`);
    for (const p of d.changed) process.stdout.write(`  changed  ${p}\n`);
    for (const p of d.extra) process.stdout.write(`  extra    ${p}\n`);
    for (const p of pins) process.stdout.write(`  pinned   ${p}\n`);
    process.stdout.write('Update them with npm run standards:update -- <version>.\n');
    return 1;
  }

  for (const p of d.extra) fs.rmSync(path.join(target, p));
  for (const [p, buf] of expected) {
    const dest = path.join(target, p);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
  }
  for (const dir of ['.github/skills', '.lbbexley/standards']) {
    const abs = path.join(target, dir);
    if (fs.existsSync(abs)) for (const e of fs.readdirSync(abs, { withFileTypes: true })) if (e.isDirectory()) removeEmptyDirs(path.join(abs, e.name));
  }
  process.stdout.write(`Synced ${expected.size} files (standards ${VERSION}): ${d.missing.length} added, ${d.changed.length} updated, ${d.extra.length} removed.\n`);
  printNotes(target);
  return 0;
}

process.exitCode = main();
