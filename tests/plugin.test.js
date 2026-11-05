'use strict';
// Structure of the marketplace and the plugin, the generated rules document,
// and the sync that brings app repositories in line with a release.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { REPO, PLUGIN, tempRepo, run } = require('./helpers');
const { RULES } = require('../plugins/lbbexley/scripts/lib/checks');

const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const frontmatter = text => {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  return Object.fromEntries(m[1].split('\n').map(l => l.match(/^([\w-]+):\s*(.*)$/)).filter(Boolean).map(x => [x[1], x[2]]));
};
const skills = fs.readdirSync(path.join(PLUGIN, 'skills')).filter(d => fs.statSync(path.join(PLUGIN, 'skills', d)).isDirectory());
const agents = fs.readdirSync(path.join(PLUGIN, 'agents')).filter(f => f.endsWith('.md'));
const SYNC = path.join(REPO, 'scripts', 'sync-app.js');

test('marketplace, plugin and package versions agree', () => {
  const market = readJson(path.join(REPO, '.claude-plugin', 'marketplace.json'));
  const plugin = readJson(path.join(PLUGIN, '.claude-plugin', 'plugin.json'));
  const pkg = readJson(path.join(REPO, 'package.json'));
  assert.equal(market.plugins.length, 1);
  assert.equal(market.plugins[0].name, plugin.name);
  assert.equal(market.plugins[0].source, './plugins/lbbexley');
  assert.match(plugin.version, /^\d+\.\d+\.\d+$/);
  assert.equal(market.version, plugin.version, 'bump the versions together');
  assert.equal(pkg.version, plugin.version, 'bump the versions together');
  assert.match(fs.readFileSync(path.join(REPO, 'CHANGELOG.md'), 'utf8'), new RegExp(`## ${plugin.version.replace(/\./g, '\\.')}\\b`), 'CHANGELOG entry for this version');
});

test('every skill has a valid SKILL.md', () => {
  assert.ok(skills.length >= 18);
  for (const s of skills) {
    const text = fs.readFileSync(path.join(PLUGIN, 'skills', s, 'SKILL.md'), 'utf8');
    const fm = frontmatter(text);
    assert.ok(fm, `${s}: frontmatter`);
    assert.equal(fm.name, s, `${s}: name matches the folder`);
    assert.match(s, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${s}: lower-case, hyphenated`);
    assert.ok(fm.description && fm.description.length <= 1024, `${s}: description of at most 1024 characters`);
    assert.ok(text.split('\n').length < 500, `${s}: SKILL.md under 500 lines`);
    if (fm.model) assert.match(fm.model, /^(opus|sonnet|haiku)$/, `${s}: model is a tier, not a version`);
  }
});

test('planning runs on the strongest model and the end-of-run check on a smaller one', () => {
  const skillModel = s => frontmatter(fs.readFileSync(path.join(PLUGIN, 'skills', s, 'SKILL.md'), 'utf8')).model;
  const agentModel = a => frontmatter(fs.readFileSync(path.join(PLUGIN, 'agents', `${a}.md`), 'utf8')).model;
  assert.equal(skillModel('architect'), 'opus');
  assert.equal(skillModel('plan'), 'opus');
  assert.equal(agentModel('end-of-run-reviewer'), 'haiku');
  assert.equal(agentModel('accessibility-reviewer'), 'sonnet');
  assert.equal(agentModel('compliance-reviewer'), 'sonnet');
});

test('links between skill files point at files that exist', () => {
  for (const s of skills) {
    const dir = path.join(PLUGIN, 'skills', s);
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
      const text = fs.readFileSync(path.join(dir, f), 'utf8');
      for (const m of text.matchAll(/\]\(([^)#:]+)\)/g)) {
        assert.ok(fs.existsSync(path.join(dir, m[1])), `${s}/${f} links to missing ${m[1]}`);
      }
    }
  }
});

test('claude-only blocks are balanced in skills and agents', () => {
  const files = [
    ...skills.flatMap(s => fs.readdirSync(path.join(PLUGIN, 'skills', s)).filter(f => f.endsWith('.md')).map(f => path.join(PLUGIN, 'skills', s, f))),
    ...agents.map(f => path.join(PLUGIN, 'agents', f)),
  ];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const open = (text.match(/<!--\s*claude-only\s*-->/g) || []).length;
    const close = (text.match(/<!--\s*\/claude-only\s*-->/g) || []).length;
    assert.equal(open, close, path.relative(REPO, file));
  }
});

test('agents are read-only and have descriptions', () => {
  assert.ok(agents.includes('end-of-run-reviewer.md'));
  for (const f of agents) {
    const fm = frontmatter(fs.readFileSync(path.join(PLUGIN, 'agents', f), 'utf8'));
    assert.ok(fm && fm.description, f);
    assert.equal(fm.tools, 'Read, Grep, Glob', `${f} is read-only`);
  }
});

test('the end-of-run reviewer asks for the report the record hook reads', () => {
  const text = fs.readFileSync(path.join(PLUGIN, 'agents', 'end-of-run-reviewer.md'), 'utf8');
  assert.match(text, /\.lbbexley\/state\/review-request\.md/);
  assert.match(text, /END-OF-RUN REVIEW/);
  assert.match(text, /"work"/);
  assert.match(text, /"harness"/);
});

test('hooks point at scripts that exist and cover the whole run', () => {
  const hooks = readJson(path.join(PLUGIN, 'hooks', 'hooks.json')).hooks;
  assert.deepEqual(Object.keys(hooks).sort(), ['PostToolUse', 'PreToolUse', 'SessionStart', 'Stop', 'SubagentStart', 'SubagentStop', 'UserPromptSubmit']);
  for (const groups of Object.values(hooks)) {
    for (const g of groups) {
      for (const h of g.hooks) {
        assert.equal(h.command, 'node', 'exec form, so paths with spaces work');
        const script = h.args[0].replace('${CLAUDE_PLUGIN_ROOT}', PLUGIN);
        assert.ok(fs.existsSync(script), script);
      }
    }
  }
});

test('the brand palette in the config matches the canvas tokens and the CSS', () => {
  const cfg = readJson(path.join(PLUGIN, 'config', 'standards.json'));
  const canvas = fs.readFileSync(path.join(PLUGIN, 'skills', 'brand', 'tokens-canvas.md'), 'utf8');
  const css = fs.readFileSync(path.join(PLUGIN, 'skills', 'brand', 'tokens.css'), 'utf8').toUpperCase();
  for (const [token, hex] of Object.entries(cfg.palette)) {
    assert.match(canvas, new RegExp(`${token} = ColorValue\\("${hex}"\\);`), `${token} in tokens-canvas.md`);
    assert.ok(css.includes(hex.toUpperCase()), `${hex} in tokens.css`);
  }
  for (const [token, pt] of Object.entries(cfg.canvasSizes)) {
    assert.match(canvas, new RegExp(`${token} = ${pt};`), `${token} in tokens-canvas.md`);
  }
});

test('the rules document is generated from the standards check', () => {
  const res = run(path.join(REPO, 'scripts', 'build-rules-doc.js'), ['--check']);
  assert.equal(res.code, 0, res.stderr);
  const doc = fs.readFileSync(path.join(PLUGIN, 'skills', 'review', 'rules.md'), 'utf8');
  for (const id of Object.keys(RULES)) assert.ok(doc.includes(`\`${id}\``), id);
});

test('every rule in the standards check has a test', () => {
  const tests = fs.readFileSync(path.join(REPO, 'tests', 'checks.test.js'), 'utf8');
  for (const [id, rule] of Object.entries(RULES)) {
    assert.ok(tests.includes(`'${id}'`), `${id} is tested in checks.test.js`);
    assert.match(rule.severity, /^(error|warning)$/, id);
    assert.ok(rule.about, id);
  }
});

test('path rules have a description and paths', () => {
  const dir = path.join(REPO, 'sync', 'rules');
  for (const f of fs.readdirSync(dir)) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.match(text, /^---\ndescription: .+\npaths:\n( {2}- ".+"\n)+---\n/, f);
  }
});

test('sync: writes the Copilot skills, agents, path rules, hooks and the standards scripts', () => {
  const target = tempRepo();
  assert.equal(run(SYNC, ['--target', target]).code, 0);
  const read = rel => fs.readFileSync(path.join(target, rel), 'utf8');

  const review = read('.github/skills/lbbexley-review/SKILL.md');
  assert.match(review, /^---\nname: lbbexley-review\n/);
  assert.doesNotMatch(review, /allowed-tools|claude-only|CLAUDE_PLUGIN_ROOT|lbbexley:/);
  assert.match(review, /npm run check/);
  assert.match(review, /For documents only, skip the items about screens and pages/, 'Copilot reviews documents without the screen checks');
  assert.match(read('.github/skills/lbbexley-canvas-apps/SKILL.md'), /`\/lbbexley-review`/);
  assert.ok(fs.existsSync(path.join(target, '.github/skills/lbbexley-canvas-apps/screen-pattern.pa.yaml')));
  assert.doesNotMatch(read('.github/skills/lbbexley-architect/SKILL.md'), /^model:/m, 'Copilot skills have no model field');

  const requirements = read('.github/skills/lbbexley-requirements/SKILL.md');
  assert.match(requirements, /\]\(\.\.\/lbbexley-data-protection\/transcripts\.md\)/, 'links between skills follow the prefix');
  assert.ok(fs.existsSync(path.join(target, '.github/skills/lbbexley-data-protection/transcripts.md')));
  assert.ok(fs.existsSync(path.join(target, '.github/skills/lbbexley-requirements/questions.md')));
  assert.match(requirements, /In Copilot, the lbbexley-plan agent can't run commands/);
  assert.match(requirements, /`\/lbbexley-architect`/);
  assert.ok(fs.existsSync(path.join(target, '.lbbexley/standards/scripts/clean-transcript.js')));
  assert.ok(fs.existsSync(path.join(target, '.lbbexley/standards/scripts/lib/transcript.js')));

  const reviewer = read('.github/agents/lbbexley-end-of-run-reviewer.agent.md');
  assert.match(reviewer, /^---\nname: lbbexley-end-of-run-reviewer\n/);
  assert.match(reviewer, /^model: \['Claude Haiku/m, 'Claude tiers become Copilot model lists');
  assert.doesNotMatch(reviewer, /CLAUDE_PLUGIN_ROOT|model: haiku/);
  assert.match(read('.github/agents/lbbexley-accessibility-reviewer.agent.md'), /\.github\/skills\/lbbexley-accessibility\/SKILL\.md/);

  const plan = read('.github/agents/lbbexley-plan.agent.md');
  assert.match(plan, /^model: \['Claude Opus/m);
  assert.match(plan, /handoffs:\n {2}- label: .+\n {4}agent: lbbexley-build\n/);
  assert.match(read('.github/agents/lbbexley-build.agent.md'), /agent: lbbexley-check\n/);
  assert.match(read('.github/agents/lbbexley-check.agent.md'), /^model: \['Claude Haiku/m);
  assert.doesNotMatch(read('.github/agents/lbbexley-check.agent.md'), /\{\{models/);

  assert.match(read('.claude/rules/lbbexley-canvas.md'), /^---\npaths:\n {2}- "\*\*\/\*\.pa\.yaml"\n---\n/);
  assert.match(read('.github/instructions/lbbexley-canvas.instructions.md'), /^---\ndescription: '.+'\napplyTo: '\*\*\/\*\.pa\.yaml'\n---\n/);

  const hooks = JSON.parse(read('.github/hooks/lbbexley.json'));
  assert.equal(hooks.version, 1);
  assert.deepEqual(Object.keys(hooks.hooks).sort(), ['agentStop', 'postToolUse', 'preToolUse', 'sessionStart', 'subagentStop']);
  for (const [event, list] of Object.entries(hooks.hooks)) {
    for (const h of list) {
      const script = h.command.match(/^node (\.lbbexley\/standards\/scripts\/[a-z-]+\.js)$/);
      assert.ok(script, `${event}: runs a standards script`);
      assert.ok(fs.existsSync(path.join(target, script[1])), `${event}: ${script[1]} is synced`);
      assert.equal(h.env.LBBEXLEY_HARNESS, 'copilot');
    }
  }

  assert.ok(fs.existsSync(path.join(target, '.lbbexley/standards/scripts/lbbexley-check.js')));
  assert.ok(fs.existsSync(path.join(target, '.lbbexley/standards/config/standards.json')));
  for (const f of ['a11y.spec.js', 'shared.js', 'playwright.config.js', 'login.js']) {
    assert.ok(fs.existsSync(path.join(target, '.lbbexley/standards/tests/accessibility', f)), `accessibility runner: ${f}`);
  }
  assert.match(read('.lbbexley/standards/README.md'), /Generated from lbbexley-digital-standards \d+\.\d+\.\d+/);
});

test('sync: the accessibility runner reads the service\'s own targets and keeps its output at the root', () => {
  const targets = JSON.stringify({ targets: [{ name: 'Start page', url: '/start' }] });
  const target = tempRepo({ 'tests/accessibility/targets.json': targets });
  run(SYNC, ['--target', target]);
  assert.equal(fs.readFileSync(path.join(target, 'tests/accessibility/targets.json'), 'utf8'), targets, 'targets.json is the service\'s own');
  const shared = path.join(target, '.lbbexley/standards/tests/accessibility/shared.js');
  fs.writeFileSync(path.join(target, 'probe.js'), `const s = require(${JSON.stringify(shared)}); console.log(JSON.stringify({ root: s.ROOT, state: s.STATE, names: s.loadTargets().map(t => t.name) }));`);
  const out = JSON.parse(run(path.join(target, 'probe.js'), [], { cwd: target }).stdout);
  assert.equal(fs.realpathSync(out.root), fs.realpathSync(target));
  assert.equal(path.relative(out.root, out.state), path.join('.auth', 'a11y-state.json'));
  assert.deepEqual(out.names, ['Start page']);
  const config = fs.readFileSync(path.join(target, '.lbbexley/standards/tests/accessibility/playwright.config.js'), 'utf8');
  assert.match(config, /outputDir: path\.join\(ROOT, 'test-results'\)/);
  assert.match(config, /outputFolder: path\.join\(ROOT, 'playwright-report'\)/);
});

test('sync: says what to change by hand in a repository made from an older template', () => {
  const target = tempRepo({
    'package.json': JSON.stringify({ scripts: { 'test:a11y': 'playwright test --config tests/accessibility/playwright.config.js', 'test:a11y:login': 'node tests/accessibility/login.js' } }),
    'tests/accessibility/a11y.spec.js': '// old copy\n',
    'tests/accessibility/targets.json': '{"targets":[]}',
  });
  const res = run(SYNC, ['--target', target]);
  assert.match(res.stdout, /change the "test:a11y" script to: playwright test --config \.lbbexley\/standards\/tests\/accessibility\/playwright\.config\.js/);
  assert.match(res.stdout, /change the "test:a11y:login" script to: node \.lbbexley\/standards\/tests\/accessibility\/login\.js/);
  assert.match(res.stdout, /Delete the old copies of the test runner in tests\/accessibility\/ \(a11y\.spec\.js\)\. Keep targets\.json/);
  assert.match(res.stdout, /add a "transcript:clean" script: node \.lbbexley\/standards\/scripts\/clean-transcript\.js/);
  assert.match(res.stdout, /Add docs\/discovery\/\.gitignore and docs\/discovery\/README\.md from the app template/);
  assert.ok(fs.existsSync(path.join(target, 'tests/accessibility/a11y.spec.js')), 'the sync never deletes files it does not own');
  const current = tempRepo({
    'package.json': JSON.stringify({ scripts: { 'test:a11y': 'playwright test --config .lbbexley/standards/tests/accessibility/playwright.config.js', 'transcript:clean': 'node .lbbexley/standards/scripts/clean-transcript.js' } }),
    'docs/discovery/.gitignore': '*\n!.gitignore\n!README.md\n',
  });
  assert.doesNotMatch(run(SYNC, ['--target', current]).stdout, /To finish moving/);
});

test('sync: the synced standards check runs in the app repository', () => {
  const target = tempRepo({ 'AGENTS.md': 'Bexley standards apply (lbbexley plugin).\n', 'src/Home.pa.yaml': 'Screens:\n  S:\n    Properties:\n      Fill: =Color.Red\n' });
  run(SYNC, ['--target', target]);
  const check = run(path.join(target, '.lbbexley/standards/scripts/lbbexley-check.js'), ['--root', target, 'src'], { cwd: target });
  assert.equal(check.code, 1);
  assert.match(check.stdout, /canvas-hardcoded-colour/);
  const all = run(path.join(target, '.lbbexley/standards/scripts/lbbexley-check.js'), ['--root', target, '.'], { cwd: target });
  assert.doesNotMatch(all.stdout, /\.github\/skills\/|\.lbbexley\/standards\//, 'synced files are not checked as the app\'s own');
});

test('sync: leaves the repository\'s own files alone, removes stale ones and detects drift', () => {
  const target = tempRepo({
    '.github/skills/team-own/SKILL.md': 'their own skill\n',
    '.github/agents/team.agent.md': 'their own agent\n',
    '.github/instructions/team.instructions.md': 'their own instructions\n',
    '.claude/rules/team.md': 'their own rule\n',
    '.github/hooks/team.json': '{}\n',
    '.github/skills/lbbexley-old/SKILL.md': 'stale\n',
    '.github/agents/lbbexley-old.agent.md': 'stale\n',
    '.lbbexley/standards/scripts/old.js': 'stale\n',
    '.lbbexley/improvements.md': '# Ideas\n',
  });

  assert.equal(run(SYNC, ['--target', target, '--check']).code, 1);
  assert.equal(run(SYNC, ['--target', target]).code, 0);
  assert.equal(run(SYNC, ['--target', target, '--check']).code, 0);

  for (const own of ['.github/skills/team-own/SKILL.md', '.github/agents/team.agent.md', '.github/instructions/team.instructions.md', '.claude/rules/team.md', '.github/hooks/team.json', '.lbbexley/improvements.md']) {
    assert.ok(fs.existsSync(path.join(target, own)), `${own} is left alone`);
  }
  for (const stale of ['.github/skills/lbbexley-old', '.github/agents/lbbexley-old.agent.md', '.lbbexley/standards/scripts/old.js']) {
    assert.ok(!fs.existsSync(path.join(target, stale)), `${stale} is removed`);
  }

  fs.appendFileSync(path.join(target, '.github/skills/lbbexley-brand/SKILL.md'), '\nlocal edit\n');
  fs.rmSync(path.join(target, '.claude/rules/lbbexley-flows.md'));
  const drift = run(SYNC, ['--target', target, '--check']);
  assert.equal(drift.code, 1);
  assert.match(drift.stdout, /changed {2}\.github\/skills\/lbbexley-brand\/SKILL\.md/);
  assert.match(drift.stdout, /missing {2}\.claude\/rules\/lbbexley-flows\.md/);
  assert.match(drift.stdout, /npm run standards:update/);
});

const VERSION = readJson(path.join(PLUGIN, '.claude-plugin', 'plugin.json')).version;
const settingsPinnedTo = ref => JSON.stringify({
  extraKnownMarketplaces: { 'lbbexley-digital': { source: { source: 'github', repo: 'dbraben/lbbexley-digital-standards', ...(ref ? { ref } : {}) } } },
  permissions: { allow: ['Bash(git add *)', 'Bash(git commit *)', 'Bash(pac solution sync*)', 'Bash(git push *)'] },
}, null, 2);
const workflowPinnedTo = (uses, ref) => [
  'jobs:',
  '  standards:',
  `    uses: dbraben/lbbexley-digital-standards/.github/workflows/standards-check.yml@${uses}`,
  '    with:',
  `      standards-ref: ${ref}`,
  '',
].join('\n');

test('sync: a different release named for Claude Code or the check on GitHub fails the check', () => {
  const target = tempRepo({
    '.claude/settings.json': settingsPinnedTo('v0.0.1'),
    '.github/workflows/quality.yml': workflowPinnedTo('v0.0.1', 'v0.0.2'),
  });
  run(SYNC, ['--target', target]);
  const res = run(SYNC, ['--target', target, '--check']);
  assert.equal(res.code, 1);
  assert.match(res.stdout, new RegExp(`pinned {3}\\.claude/settings\\.json installs the Claude Code plugin from v0\\.0\\.1, not v${VERSION.replace(/\./g, '\\.')}`));
  assert.match(res.stdout, /pinned {3}\.github\/workflows\/quality\.yml runs the check on GitHub from v0\.0\.1/);
  assert.match(res.stdout, /pinned {3}\.github\/workflows\/quality\.yml checks against the standards at v0\.0\.2/);
  assert.match(res.stdout, /npm run standards:update/);

  fs.writeFileSync(path.join(target, '.claude/settings.json'), settingsPinnedTo(`v${VERSION}`));
  fs.writeFileSync(path.join(target, '.github/workflows/quality.yml'), workflowPinnedTo(`v${VERSION}`, `'v${VERSION}'`));
  const same = run(SYNC, ['--target', target, '--check']);
  assert.equal(same.code, 0, same.stdout);
  assert.doesNotMatch(same.stdout, /pinned|To finish moving/);

  fs.writeFileSync(path.join(target, '.github/workflows/quality.yml'), workflowPinnedTo('ab12'.repeat(10), `v${VERSION}`));
  assert.equal(run(SYNC, ['--target', target, '--check']).code, 0, 'a commit SHA in the workflow is left alone');
});

test('sync: says how to pin the marketplace, let Claude commit and ignore transcripts in an older repository', () => {
  const target = tempRepo({
    'package.json': JSON.stringify({ scripts: { 'transcript:clean': 'node .lbbexley/standards/scripts/clean-transcript.js' } }),
    'docs/discovery/.gitignore': '*\n!.gitignore\n!README.md\n',
    '.claude/settings.json': JSON.stringify({ extraKnownMarketplaces: { 'lbbexley-digital': { source: { source: 'github', repo: 'dbraben/lbbexley-digital-standards' } } } }),
    '.gitignore': '.env\n.auth/\n',
  });
  const res = run(SYNC, ['--target', target]);
  assert.match(res.stdout, new RegExp(`pin the Bexley marketplace to this release.+add "ref": "v${VERSION.replace(/\./g, '\\.')}"`));
  assert.match(res.stdout, /add "Bash\(git add \*\)", "Bash\(git commit \*\)"/);
  assert.match(res.stdout, /In \.gitignore, add \*\.vtt and \*\.roles\.json/);
  assert.equal(run(SYNC, ['--target', target, '--check']).code, 0, 'an unpinned marketplace is a note, not drift');
});

test('update: moves the check on GitHub and the Claude Code marketplace to the release, and keeps settings.json as it was otherwise', () => {
  const { spawnSync } = require('child_process');
  const os = require('os');
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'lbbexley-update-'));
  const git = (cwd, ...a) => spawnSync('git', a, { cwd, encoding: 'utf8' });
  // A local copy of the standards with a release tag, so nothing is downloaded.
  const standards = path.join(work, 'standards');
  fs.cpSync(REPO, standards, { recursive: true, filter: src => !/[\\/](node_modules|\.git)$/.test(src) });
  git(standards, 'init', '-q');
  git(standards, 'add', '--all');
  git(standards, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'release');
  git(standards, 'tag', `v${VERSION}`);

  const app = tempRepo({
    'package.json': JSON.stringify({ scripts: { 'transcript:clean': 'node .lbbexley/standards/scripts/clean-transcript.js' } }),
    'docs/discovery/.gitignore': '*\n',
    '.claude/settings.json': `${settingsPinnedTo(null)}\n`,
    '.claude/settings.local.json': JSON.stringify({ extraKnownMarketplaces: { 'lbbexley-digital': { source: { source: 'github', repo: 'dbraben/lbbexley-digital-standards', ref: 'v0.0.1' } } } }),
    '.github/workflows/quality.yml': workflowPinnedTo('v0.0.1', 'v0.0.1'),
  });
  run(SYNC, ['--target', app]);
  const res = run(path.join(app, '.lbbexley/standards/scripts/update.js'), [`v${VERSION}`], {
    cwd: app,
    env: { LBBEXLEY_STANDARDS_SOURCE: standards, LBBEXLEY_SKIP_PLUGIN_UPDATE: '1' },
  });
  assert.equal(res.code, 0, res.stderr);
  assert.equal(readJson(path.join(app, '.claude/settings.json')).extraKnownMarketplaces['lbbexley-digital'].source.ref, `v${VERSION}`);
  assert.equal(fs.readFileSync(path.join(app, '.claude/settings.json'), 'utf8'), `${settingsPinnedTo(`v${VERSION}`)}\n`, 'only the ref changes');
  assert.equal(readJson(path.join(app, '.claude/settings.local.json')).extraKnownMarketplaces['lbbexley-digital'].source.ref, `v${VERSION}`, 'a marketplace added for this computer only moves too');
  assert.match(fs.readFileSync(path.join(app, '.github/workflows/quality.yml'), 'utf8'), new RegExp(`standards-check\\.yml@v${VERSION.replace(/\./g, '\\.')}\\n[\\s\\S]*standards-ref: v${VERSION.replace(/\./g, '\\.')}\\n`));
  assert.match(res.stdout, new RegExp(`claude plugin marketplace add dbraben/lbbexley-digital-standards#v${VERSION.replace(/\./g, '\\.')} --scope local`), 'commands typed by hand leave settings.json alone');
  assert.match(res.stdout, /claude plugin update lbbexley@lbbexley-digital/);
  assert.equal(run(SYNC, ['--target', app, '--check']).code, 0, 'every pin now names the release');
  fs.rmSync(work, { recursive: true, force: true });
});

test('sync: says how to move a repository made from an older template to building in the dev environment', () => {
  const old = tempRepo({
    'package.json': JSON.stringify({ scripts: { 'transcript:clean': 'node .lbbexley/standards/scripts/clean-transcript.js' } }),
    'docs/discovery/.gitignore': '*\n',
    '.claude/settings.json': JSON.stringify({ extraKnownMarketplaces: { 'lbbexley-digital': { source: { source: 'github', repo: 'dbraben/lbbexley-digital-standards', ref: `v${VERSION}` } } }, permissions: { allow: ['Bash(git add *)', 'Bash(git commit *)'] } }),
    '.gitignore': '*.vtt\n*.roles.json\n',
    'AGENTS.md': '# Service\n\nBexley standards apply (lbbexley plugin).\n',
    '.vscode/settings.json': JSON.stringify({ 'chat.useHooks': true }),
  });
  const res = run(SYNC, ['--target', old]);
  assert.match(res.stdout, /let the assistant build in the dev environment, bring in the latest version, commit and push without asking/);
  assert.match(res.stdout, /In \.gitignore, add src\/canvas\/\*\*\/\*\.md/);
  assert.match(res.stdout, /In AGENTS\.md, replace the "How work runs" section/);
  assert.match(res.stdout, /In \.vscode\/settings\.json, add the app template's chat\.tools\.terminal\.autoApprove rules/);

  const current = tempRepo({
    'package.json': JSON.stringify({ scripts: { 'transcript:clean': 'node .lbbexley/standards/scripts/clean-transcript.js' } }),
    'docs/discovery/.gitignore': '*\n',
    '.claude/settings.json': JSON.stringify({ extraKnownMarketplaces: { 'lbbexley-digital': { source: { source: 'github', repo: 'dbraben/lbbexley-digital-standards', ref: `v${VERSION}` } } }, permissions: { allow: ['Bash(git commit *)', 'Bash(pac solution sync*)', 'Bash(git push *)'] } }),
    '.gitignore': '*.vtt\n*.roles.json\nsrc/canvas/**/*.md\n',
    'AGENTS.md': '# Service\n\nBexley standards apply (lbbexley plugin). Run pac solution sync after each change.\n',
    '.vscode/settings.json': JSON.stringify({ 'chat.tools.terminal.autoApprove': { '/^git push$/': true } }),
  });
  assert.doesNotMatch(run(SYNC, ['--target', current]).stdout, /To finish moving/);
});
