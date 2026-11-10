'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { PLUGIN, SCRIPTS, tempRepo, run, nhsNumber, luhnNumber, spaced, personalEmail, niNumber } = require('./helpers');
const { loadStandards } = require(path.join(SCRIPTS, 'lib', 'config'));
const { checkContent, globToRegExp, parseIgnore } = require(path.join(SCRIPTS, 'lib', 'checks'));
const { findPersonalData, TEST_CARDS } = require(path.join(SCRIPTS, 'lib', 'personal-data'));
const { contrast, fade } = require(path.join(SCRIPTS, 'lib', 'colour'));

const cfg = loadStandards();
const rules = findings => findings.map(f => f.rule);
const at = findings => findings.map(f => [f.rule, f.line]);
const CLI = path.join(SCRIPTS, 'lbbexley-check.js');

// A screen with one heading, so screen-level rules stay quiet unless a test wants them.
const screen = (children, props = '') => [
  'Screens:',
  '  Home Screen:',
  '    Properties:',
  `      Fill: =BexleyWhite${props}`,
  '    Children:',
  '      - lblHeading:',
  '          Control: Label@2.5.1',
  '          Properties:',
  '            Text: ="Book an appointment"',
  '            Role: =TextRole.Heading1',
  ...children,
].join('\n');

// ---------- colour maths ----------

test('contrast ratios match the brand guide', () => {
  assert.equal(contrast('#FFFFFF', '#912B88').toFixed(2), '7.23');
  assert.equal(contrast('#0B0C0C', '#FFFFFF').toFixed(2), '19.59');
  assert.equal(contrast('#FFFFFF', '#BFC1C3').toFixed(2), '1.81');
  assert.equal(fade('#FFFFFF', -1), '#000000');
  assert.equal(fade('#000000', 1), '#FFFFFF');
  assert.equal(fade('#808080', 0), '#808080');
});

// ---------- canvas ----------

test('the screen pattern shipped in the canvas-apps skill passes every rule', () => {
  const file = path.join(PLUGIN, 'skills', 'canvas-apps', 'screen-pattern.pa.yaml');
  assert.deepEqual(checkContent(file, fs.readFileSync(file, 'utf8'), cfg), []);
});

test('canvas: colour literals outside App.Formulas are errors; transparent is allowed', () => {
  const yaml = screen([
    '      - lblTitle:',
    '          Control: Label@2.5.1',
    '          Properties:',
    '            Color: =Color.Red',
    '            Fill: =Color.Transparent',
    '            BorderColor: =RGBA(0, 0, 0, 0)',
    '            HoverFill: =ColorValue("#123456")',
  ], '\n      LoadingSpinnerColor: =RGBA(255, 0, 0, 1)');
  assert.deepEqual(at(checkContent('src/Home.pa.yaml', yaml, cfg)), [
    ['canvas-hardcoded-colour', 5],
    ['canvas-hardcoded-colour', 15],
    ['canvas-hardcoded-colour', 18],
  ]);
});

test('canvas: App.Formulas may define palette colours, flags others and legacy ones', () => {
  const yaml = [
    'App:',
    '  Properties:',
    '    Formulas: |-',
    '      BexleyFuchsia = ColorValue("#912B88");',
    '      Mystery = ColorValue("#123456");',
    '      OldRoyal = ColorValue("#2E358B");',
    '      Clear = RGBA(0, 0, 0, 0);',
    '    OnStart: =Set(gblColour, RGBA(1, 2, 3, 1))',
  ].join('\n');
  assert.deepEqual(checkContent('src/App.pa.yaml', yaml, cfg).map(x => [x.rule, x.severity, x.line]), [
    ['canvas-off-palette', 'error', 5],
    ['legacy-colour', 'warning', 6],
    ['canvas-hardcoded-colour', 'error', 8],
  ]);
});

test('canvas: inputs, icons and images need an AccessibleLabel of their own', () => {
  const yaml = screen([
    '      - txtPostcode:',
    '          Control: Classic/TextInput@2.3.2',
    '          Properties:',
    '            Default: =""',
    '      - icoDelete:',
    '          Control: Classic/Icon@2.5.0',
    '          Properties:',
    '            AccessibleLabel: ="Delete request"',
    '      - conGroup:',
    '          Control: GroupContainer@1.3.0',
    '          Properties:',
    '            Width: =100',
    '          Children:',
    '            - imgLogo:',
    '                Control: Image@2.2.3',
    '                Properties:',
    '                  Height: =40',
    '            - lblCaption:',
    '                Control: Label@2.5.1',
    '                Properties:',
    '                  AccessibleLabel: ="Not the image\'s label"',
  ]);
  const f = checkContent('src/Home.pa.yaml', yaml, cfg);
  assert.deepEqual(at(f), [['canvas-missing-label', 12], ['canvas-missing-label', 25]]);
  assert.match(f[0].message, /txtPostcode \(textinput\)/);
  assert.match(f[1].message, /imgLogo \(image\)/);
});

test('canvas: focus order, visible focus and target size', () => {
  const yaml = screen([
    '      - btnGo:',
    '          Control: Classic/Button@2.2.0',
    '          Properties:',
    '            Text: ="Continue"',
    '            TabIndex: =2',
    '            FocusedBorderThickness: =0',
    '            Height: =20',
    '            Width: =160',
    '      - icoInfo:',
    '          Control: Classic/Icon@2.5.0',
    '          Properties:',
    '            AccessibleLabel: ="More information"',
    '            OnSelect: =Navigate(\'Help Screen\')',
    '            Height: =16',
    '            Width: =16',
    '      - icoDecor:',
    '          Control: Classic/Icon@2.5.0',
    '          Properties:',
    '            AccessibleLabel: =""',
    '            TabIndex: =-1',
    '            Height: =16',
  ]);
  assert.deepEqual(at(checkContent('src/Home.pa.yaml', yaml, cfg)), [
    ['canvas-tabindex', 15],
    ['canvas-focus-hidden', 16],
    ['canvas-target-size', 17],
    ['canvas-target-size', 24],
    ['canvas-target-size', 25],
  ]);
});

test('canvas: token colour pairs must meet contrast, with the large-text allowance', () => {
  const yaml = screen([
    '      - btnBad:',
    '          Control: Classic/Button@2.2.0',
    '          Properties:',
    '            Text: ="Continue"',
    '            Fill: =BexleyAquaLight',
    '            Color: =BexleyWhite',
    '            HoverFill: =ColorFade(BexleyFuchsia, -20%)',
    '            HoverColor: =BexleyWhite',
    '      - lblGrey:',
    '          Control: Label@2.5.1',
    '          Properties:',
    '            Text: ="Small grey on panel"',
    '            Color: =BexleyTextGrey',
    '            Fill: =BexleyPanel',
    '            Size: =BexleySizeBody',
    '      - lblBigGrey:',
    '          Control: Label@2.5.1',
    '          Properties:',
    '            Text: ="Large grey on panel"',
    '            Color: =BexleyTextGrey',
    '            Fill: =BexleyPanel',
    '            Size: =BexleySizeH3',
  ]);
  const f = checkContent('src/Home.pa.yaml', yaml, cfg);
  assert.deepEqual(at(f), [['canvas-contrast', 16], ['canvas-contrast', 23]]);
  assert.match(f[0].message, /Color on Fill is 1\.\d\d:1, below the 4\.5:1 minimum/);
  assert.match(f[1].message, /3\.4\d:1, below the 4\.5:1 minimum for normal text/);
});

test('canvas: transparent and unset backgrounds are checked against what is behind them', () => {
  const yaml = screen([
    '      - conFooter:',
    '          Control: GroupContainer@1.3.0',
    '          Properties:',
    '            Fill: =BexleyHighlight',
    '          Children:',
    '            - btnLink:',
    '                Control: Classic/Button@2.2.0',
    '                Properties:',
    '                  Text: ="Accessibility statement"',
    '                  Size: =BexleySizeSmall',
    '                  Fill: =Color.Transparent',
    '                  Color: =BexleyLink',
    '                  HoverFill: =Color.Transparent',
    '                  HoverColor: =BexleyLinkHover',
    '                  PressedFill: =RGBA(0, 0, 0, 0)',
    '                  PressedColor: =BexleyLinkVisited',
    '            - lblNote:',
    '                Control: Label@2.5.1',
    '                Properties:',
    '                  Text: ="White text, no fill of its own"',
    '                  Color: =BexleyWhite',
    '      - lblOnScreen:',
    '          Control: Label@2.5.1',
    '          Properties:',
    '            Text: ="Straight on the screen"',
    '            Color: =BexleyBorder',
  ]);
  const f = checkContent('src/Home.pa.yaml', yaml, cfg);
  assert.deepEqual(at(f), [['canvas-contrast', 24], ['canvas-contrast', 31], ['canvas-contrast', 36]]);
  assert.match(f[0].message, /btnLink: HoverColor on conFooter's Fill \(HoverFill is transparent\) is 3\.3\d:1/);
  assert.match(f[1].message, /lblNote: Color on conFooter's Fill \(Fill is not set\) is 1\.\d\d:1/);
  assert.match(f[2].message, /lblOnScreen: Color on Home Screen's Fill \(Fill is not set\) is 1\.\d\d:1/);
});

test('canvas: nothing is guessed when the background behind a control is unknown', () => {
  const yaml = [
    'Screens:',
    '  Plain Screen:',
    '    Children:',
    '      - conTheme:',
    '          Control: GroupContainer@1.3.0',
    '          Properties:',
    '            Fill: =gblThemeColour',
    '          Children:',
    '            - lblHeading:',
    '                Control: Label@2.5.1',
    '                Properties:',
    '                  Text: ="Today\'s appointments"',
    '                  Role: =TextRole.Heading1',
    '                  Color: =BexleyWhite',
    '      - btnGhost:',
    '          Control: Classic/Button@2.2.0',
    '          Properties:',
    '            Text: ="Go"',
    '            Fill: =Color.Transparent',
    '            Color: =BexleyWhite',
  ].join('\n');
  assert.deepEqual(checkContent('src/Plain.pa.yaml', yaml, cfg), []);
});

test('canvas: each screen with text needs exactly one Heading1', () => {
  const none = 'Screens:\n  Empty Screen:\n    Children:\n      - lblText:\n          Control: Label@2.5.1\n          Properties:\n            Text: ="Hello"\n';
  assert.deepEqual(at(checkContent('src/S.pa.yaml', none, cfg)), [['canvas-heading', 2]]);
  const two = screen(['      - lblAgain:', '          Control: Label@2.5.1', '          Properties:', '            Role: =TextRole.Heading1']);
  assert.deepEqual(at(checkContent('src/S.pa.yaml', two, cfg)), [['canvas-heading', 14]]);
  assert.deepEqual(checkContent('src/S.pa.yaml', 'Screens:\n  Blank Screen:\n    Properties:\n      Fill: =BexleyWhite\n', cfg), []);
});

test('canvas: small text, Lato only, and buttons disabled until a form is complete', () => {
  const yaml = screen([
    '      - lblTiny:',
    '          Control: Label@2.5.1',
    '          Properties:',
    '            Size: =10',
    '            Font: =Font.\'Open Sans\'',
    '      - btnSend:',
    '          Control: Classic/Button@2.2.0',
    '          Properties:',
    '            Text: ="Send"',
    '            DisplayMode: =If(IsBlank(txtName.Text), DisplayMode.Disabled, DisplayMode.Edit)',
  ]);
  assert.deepEqual(at(checkContent('src/S.pa.yaml', yaml, cfg)), [
    ['canvas-text-size', 14],
    ['canvas-font', 15],
    ['canvas-disabled-button', 20],
  ]);
});

// ---------- solutions ----------

test('solutions must use the lbbexley publisher', () => {
  const bad = '<ImportExportXml><SolutionManifest><Publisher><UniqueName>DefaultPublisherorg1</UniqueName><CustomizationPrefix>new</CustomizationPrefix></Publisher></SolutionManifest></ImportExportXml>';
  assert.deepEqual(rules(checkContent('src/Other/Solution.xml', bad, cfg)).sort(), ['solution-default-publisher', 'solution-prefix']);
  const good = '<ImportExportXml><SolutionManifest><Publisher><UniqueName>LondonBoroughofBexley</UniqueName><CustomizationPrefix>lbbexley</CustomizationPrefix></Publisher></SolutionManifest></ImportExportXml>';
  assert.deepEqual(checkContent('src/Permits/Solution.xml', good, cfg), []);
});

// ---------- web ----------

test('html: lang, title, alt text, new tabs, Google Fonts and tracking', () => {
  const html = [
    '<html>',
    '<head><link href="https://fonts.googleapis.com/css2?family=Lato" rel="stylesheet">',
    '<script src="https://www.googletagmanager.com/gtag/js?id=G-TEST"></script></head>',
    '<body><img src="logo.png">',
    '<img src="bins.png" alt="Picture of bins">',
    '<img src="rule.png" alt="">',
    '<a href="https://example.com" target="_blank">Help</a>',
    '<a href="https://example.com" target="_blank">Help (opens in new tab)</a>',
    '</body></html>',
  ].join('\n');
  const f = checkContent('src/pages/index.html', html, cfg);
  assert.deepEqual(at(f), [
    ['html-lang', 1],
    ['google-fonts', 2],
    ['html-title', 2],
    ['tracking-script', 3],
    ['html-img-alt', 4],
    ['html-alt-text', 5],
    ['html-new-tab', 7],
  ]);
});

test('html: labels, link names, focus order, autoplay, zoom and heading order', () => {
  const html = [
    '<!doctype html><html lang="en-GB"><head><title>Apply – Parking permits – London Borough of Bexley</title>',
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"></head><body>',
    '<h1>Book</h1><h3>Details</h3>',
    '<label for="postcode">Postcode</label><input id="postcode">',
    '<input id="nolabel">',
    '<label>Name <input id="name"></label>',
    '<input type="hidden" id="token"><input aria-label="Search">',
    '<a href="/x"><img src="i.png" alt=""></a>',
    '<a href="/y"><img src="i.png" alt="Help"></a>',
    '<button></button><button aria-label="Close"></button>',
    '<div tabindex="3">Odd</div><div tabindex="0">Fine</div>',
    '<video autoplay src="v.mp4"></video>',
    '<h1>Again</h1>',
    '</body></html>',
  ].join('\n');
  assert.deepEqual(at(checkContent('src/pages/book.html', html, cfg)), [
    ['html-zoom-disabled', 2],
    ['html-heading-order', 3],
    ['html-input-label', 5],
    ['html-empty-link', 8],
    ['html-empty-link', 10],
    ['html-tabindex', 11],
    ['html-autoplay', 12],
    ['html-heading-order', 13],
  ]);
});

test('css: fonts, colours, contrast and hidden focus', () => {
  const css = [
    'body { font-family: Arial; color: #000; }',
    '.a { color: #0B0C0C; background: #912b88; border-color: #FFF; }',
    '.b { color: #123456; }',
    '.c { color: #286FD4; }',
    '.promo { color: var(--bexley-white); background-color: var(--bexley-fuchsia); }',
    'a:focus { outline: none; }',
    'button:focus { outline: 0; box-shadow: 0 0 0 3px var(--bexley-focus); }',
  ].join('\n');
  const f = checkContent('src/site.css', css, cfg);
  assert.deepEqual(at(f), [
    ['css-font', 1],
    ['css-pure-black', 1],
    ['css-contrast', 2],
    ['css-off-palette', 3],
    ['legacy-colour', 4],
    ['css-focus-hidden', 6],
  ]);
  assert.deepEqual(checkContent('src/bootstrap.min.css', css, cfg), []);
  const tokens = path.join(PLUGIN, 'skills', 'brand', 'tokens.css');
  assert.deepEqual(checkContent(tokens, fs.readFileSync(tokens, 'utf8'), cfg), [], 'tokens.css passes its own rules');
});

// ---------- agents, cards and flows ----------

test('adaptive card images need altText, in JSON and YAML', () => {
  const card = JSON.stringify({ type: 'AdaptiveCard', body: [{ type: 'Image', url: 'a.png' }, { type: 'Image', url: 'b.png', altText: 'Bexley logo' }] }, null, 2);
  assert.deepEqual(rules(checkContent('cards/booked.json', card, cfg)), ['card-image-alt']);
  const yaml = [
    'kind: AdaptiveCardTemplate',
    'card:',
    '  type: AdaptiveCard',
    '  body:',
    '    - type: Image',
    '      url: https://example.com/a.png',
    '    - type: Image',
    '      url: https://example.com/b.png',
    '      altText: Bexley logo',
  ].join('\n');
  assert.deepEqual(at(checkContent('src/agent/topics/Booked.mcs.yml', yaml, cfg)), [['card-image-alt', 5]]);
});

test('flows: error handling, hard-coded mailboxes and email images without alt text', () => {
  const flow = JSON.stringify({
    properties: {
      definition: {
        actions: {
          Get_the_booking: { type: 'OpenApiConnection', runAfter: {} },
          Compose: { type: 'Compose', runAfter: { Get_the_booking: ['Succeeded'] } },
          Send_confirmation: {
            type: 'OpenApiConnection',
            inputs: { to: 'permits.team@bexley.gov.uk', body: '<p>Booked</p><img src="https://example.com/logo.png">' },
            runAfter: { Compose: ['Succeeded'] },
          },
        },
      },
    },
  }, null, 2);
  assert.deepEqual(rules(checkContent('src/Workflows/Permits-1234.json', flow, cfg)).sort(), ['flow-error-handling', 'flow-hardcoded-mailbox', 'html-img-alt']);
  const handled = JSON.parse(flow);
  handled.properties.definition.actions = { Try: { type: 'Scope', runAfter: {}, actions: handled.properties.definition.actions }, Catch: { type: 'Scope', runAfter: { Try: ['Failed', 'TimedOut'] } } };
  handled.properties.definition.actions.Try.actions.Send_confirmation.inputs.body = '<img src="logo.png" alt="London Borough of Bexley">';
  assert.deepEqual(rules(checkContent('src/Workflows/Permits-1234.json', JSON.stringify(handled), cfg)), ['flow-hardcoded-mailbox']);
});

// ---------- personal data, placeholders and emoji ----------

test('personal data: real-looking values are found and masked', () => {
  const nhs = nhsNumber('401023213');
  const card = luhnNumber('453914880343646');
  assert.ok(nhs && card);
  const text = `NI ${niNumber()}, NHS ${spaced(nhs)}, card ${card}, email ${personalEmail()}`;
  const found = findPersonalData(text, cfg);
  assert.deepEqual(found.map(f => f.kind), ['National Insurance number', 'NHS number', 'payment card number', 'personal email address']);
  assert.ok(!found.some(f => f.masked.includes('34 56')), 'NI number middle digits are hidden');
});

test('personal data: the safe fictional formats are never flagged', () => {
  const text = ['QQ 12 34 56 C', `NHS ${spaced(nhsNumber('999000001'))}`, 'alex.testperson@example.com', 'sam@example.org', ...TEST_CARDS, '07700 900123, 020 7946 0321, 01632 960 001'].join('\n');
  assert.deepEqual(findPersonalData(text, cfg), []);
});

test('placeholder text and emoji are errors in build files', () => {
  const yaml = screen([
    '      - lblBody:',
    '          Control: Label@2.5.1',
    '          Properties:',
    '            Text: ="Lorem ipsum dolor"',
    '      - lblDone:',
    '          Control: Label@2.5.1',
    '          Properties:',
    '            Text: ="Booked \u{1F389}"',
    '            Tooltip: ="\u00A9 London Borough of Bexley"',
  ]);
  assert.deepEqual(rules(checkContent('src/S.pa.yaml', yaml, cfg)), ['placeholder-text', 'emoji']);
  assert.deepEqual(checkContent('notes.md', 'Party \u{1F389}', cfg), []);
});

test('tenant URLs in build files are warnings', () => {
  const yaml = 'Screens:\n  S:\n    Properties:\n      OnVisible: =Launch("https://bexley.sharepoint.com/sites/permits")\n';
  assert.deepEqual(rules(checkContent('src/S.pa.yaml', yaml, cfg)), ['tenant-url']);
});

// ---------- suppressions ----------

test('suppressions work for the line and the next, and need a reason', () => {
  const yaml = [
    'Screens:',
    '  S:',
    '    Properties:',
    '      # lbbexley-ignore: canvas-hardcoded-colour matches the partner logo agreed with Communications',
    '      Fill: =RGBA(1, 2, 3, 1)',
    '      Color: =Color.Red  # lbbexley-ignore: canvas-hardcoded-colour',
    '      BorderColor: =Color.Blue',
  ].join('\n');
  assert.deepEqual(at(checkContent('src/S.pa.yaml', yaml, cfg)), [['ignore-needs-reason', 6], ['canvas-hardcoded-colour', 7]]);
  assert.deepEqual(parseIgnore('// lbbexley-ignore: emoji, canvas-font (partner widget)'), { file: false, rules: new Set(['emoji', 'canvas-font']), reason: 'partner widget' });
  assert.equal(parseIgnore('no suppression here'), null);
});

test('file-level suppressions need a reason and never hide personal data', () => {
  const body = 'Screens:\n  S:\n    Properties:\n      Fill: =Color.Red\n';
  assert.deepEqual(checkContent('src/S.pa.yaml', '# lbbexley-ignore-file generated by the partner tool, not edited here\n' + body, cfg), []);
  assert.deepEqual(rules(checkContent('src/S.pa.yaml', '# lbbexley-ignore-file\n' + body, cfg)), ['ignore-needs-reason']);
  const withData = `# lbbexley-ignore-file imported reference data\nowner,email\nA,${personalEmail()}\n`;
  assert.deepEqual(rules(checkContent('data/import.csv', withData, cfg)), ['personal-data']);
});

test('.lbbexleyignore entries need a reason', () => {
  const ignore = '# Files the standards check skips\nlegacy/**   # old app, replaced in March\nvendor/**\n';
  assert.deepEqual(at(checkContent('.lbbexleyignore', ignore, cfg)), [['ignore-needs-reason', 3]]);
});

test('glob patterns for .lbbexleyignore', () => {
  assert.ok(globToRegExp('tests/fixtures/**').test('tests/fixtures/a/b.html'));
  assert.ok(globToRegExp('*.csv').test('test-data/people.csv'));
  assert.ok(!globToRegExp('/src/*.yaml').test('other/src/a.yaml'));
});

test('release check: no template placeholders in compliance documents', () => {
  const doc = '# DPIA screening: Parking permits\n\n| Completed by | {{name, date}} |\n';
  assert.deepEqual(checkContent('docs/compliance/dpia-screening.md', doc, cfg), []);
  assert.deepEqual(at(checkContent('docs/compliance/dpia-screening.md', doc, cfg, { release: true })), [['compliance-incomplete', 3]]);
  assert.deepEqual(checkContent('docs/plans/x.md', doc, cfg, { release: true }), []);
});

// ---------- command line ----------

test('command line: warnings fail by default, ignore file, files-from, annotations and JSON', () => {
  const dir = tempRepo({
    'src/Good.pa.yaml': 'Screens:\n  S:\n    Properties:\n      Fill: =BexleyWhite\n',
    'src/Bad.pa.yaml': 'Screens:\n  S:\n    Properties:\n      Fill: =Color.Red\n',
    'src/site.css': 'body { font-family: Arial; }\n',
    'legacy/Old.pa.yaml': 'Screens:\n  S:\n    Properties:\n      Fill: =Color.Blue\n',
    '.lbbexleyignore': '# old app, being replaced\nlegacy/**  # replaced by the new app in March\n',
    'changed.txt': 'src/Good.pa.yaml\nsrc/deleted.pa.yaml\n',
    'empty.txt': '',
  });

  const all = run(CLI, ['--root', dir]);
  assert.equal(all.code, 1);
  assert.match(all.stdout, /src\/Bad\.pa\.yaml:4\s+error\s+canvas-hardcoded-colour/);
  assert.doesNotMatch(all.stdout, /legacy\/Old/);
  assert.match(run(CLI, ['--root', dir, '--github', 'src/Bad.pa.yaml']).stdout, /::error file=src\/Bad\.pa\.yaml,line=4,title=lbbexley canvas-hardcoded-colour::/);

  assert.equal(run(CLI, ['--root', dir, '--files-from', path.join(dir, 'changed.txt')]).code, 0);
  assert.match(run(CLI, ['--root', dir, '--files-from', path.join(dir, 'empty.txt')]).stdout, /No problems found in 0 file/);
  assert.equal(run(CLI, ['--root', dir, 'src/site.css']).code, 1, 'warnings fail by default');
  assert.equal(run(CLI, ['--root', dir, '--fail-on', 'error', 'src/site.css']).code, 0);
  assert.equal(run(CLI, ['--root', dir, '--fail-on', 'none']).code, 0);
  assert.equal(run(CLI, ['--bogus']).code, 2);

  const json = JSON.parse(run(CLI, ['--root', dir, '--json', 'src']).stdout);
  assert.equal(json.errors, 1);
  assert.equal(json.warnings, 1);
});

test('command line: --changed checks only what git says has changed, and --release adds the documents', () => {
  const dir = tempRepo({
    'src/Old.pa.yaml': 'Screens:\n  S:\n    Properties:\n      Fill: =Color.Red\n',
    'docs/compliance/retention.md': '# Retention\n\n{{period}}\n',
  });
  const git = args => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  git(['init', '-q']);
  git(['add', '-A']);
  git(['-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-qm', 'start']);
  fs.writeFileSync(path.join(dir, 'src', 'New.pa.yaml'), 'Screens:\n  S:\n    Properties:\n      Fill: =Color.Blue\n');

  const changed = run(CLI, ['--root', dir, '--changed']);
  assert.equal(changed.code, 1);
  assert.match(changed.stdout, /src\/New\.pa\.yaml/);
  assert.doesNotMatch(changed.stdout, /src\/Old\.pa\.yaml/);

  const release = run(CLI, ['--root', dir, '--release', '--changed']);
  assert.match(release.stdout, /docs\/compliance\/retention\.md:3\s+error\s+compliance-incomplete/);
});

test('flows: every flow needs a Try scope and a Catch scope that runs after Failed and Timed out', () => {
  const mk = actions => JSON.stringify({ properties: { definition: { actions } } });
  const check = actions => rules(checkContent('src/Workflows/Small-1.json', mk(actions), cfg));
  assert.deepEqual(check({ Only: { type: 'Compose', runAfter: {} } }), ['flow-error-handling']);
  assert.deepEqual(check({
    Only: { type: 'Compose', runAfter: {} },
    Tidy: { type: 'Compose', runAfter: { Only: ['Failed'] } },
  }), ['flow-error-handling']);
  assert.deepEqual(check({
    Try: { type: 'Scope', runAfter: {}, actions: {} },
    Catch: { type: 'Scope', runAfter: { Try: ['Failed'] } },
  }), ['flow-error-handling']);
  assert.deepEqual(check({
    Try: { type: 'Scope', runAfter: {}, actions: {} },
    Catch: { type: 'Scope', runAfter: { Try: ['Failed', 'TimedOut'] } },
    Finally: { type: 'Scope', runAfter: { Try: ['Succeeded', 'Failed', 'TimedOut', 'Skipped'] } },
  }), []);
  assert.deepEqual(rules(checkContent('src/Workflows/Bad-1.json', '{ not json', cfg)), []);
});
