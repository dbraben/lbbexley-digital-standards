'use strict';
// For every page and screen in targets.json:
//   - axe finds no WCAG 2.2 A or AA violations, of any impact
//   - pages reflow at 320 CSS pixels with no sideways scrolling (WCAG 1.4.10)
//   - every tab stop on a page shows a visible focus indicator (WCAG 2.4.7)
// Canvas apps are checked inside their app frame, so Microsoft's player around
// them doesn't count against the app.
//
// A target that isn't tested doesn't pass: one that needs a saved sign-in fails
// until there is one, and fails if it opens a sign-in page because the saved
// sign-in has expired. A11Y_SKIP_SIGNED_IN=1 reports the targets that need a
// sign-in as skipped instead, for a workflow that can't sign in, with those
// tests run on a developer's computer. With A11Y_BASE_URL set there's a site to
// test, so an empty targets.json fails too. How many targets were run goes in
// the report and, on GitHub, the run's summary.
//
// Synced from the standards repository (sync/tests/accessibility/): don't edit
// the copy in an app repository. The pages and screens come from the app
// repository's tests/accessibility/targets.json.

const fs = require('fs');
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { STATE, CANVAS_FRAME, WCAG_TAGS, SIGN_IN_PAGE, loadTargets, absoluteUrl } = require('./shared');

const signedIn = fs.existsSync(STATE);
const skipSignedIn = /^(1|true|yes)$/i.test(process.env.A11Y_SKIP_SIGNED_IN || '');
const all = loadTargets();
const targets = all.filter(t => !t.auth || signedIn);
const needSignIn = all.filter(t => t.auth && !signedIn);

// A target that needs a sign-in has landed on a sign-in page: the tests would
// check that page instead of the service.
function stopIfSignedOut(page, target) {
  if (target.auth && SIGN_IN_PAGE.test(page.url())) {
    throw new Error('Not tested, so not passed: this target opened a sign-in page, so the saved sign-in has expired or belongs to an account that can\'t see it. Run npm run test:a11y:login again with the test account, then run the tests again.');
  }
}

async function open(page, target) {
  await page.goto(absoluteUrl(target.url), { waitUntil: 'domcontentloaded' });
  stopIfSignedOut(page, target);
  try {
    if (target.type === 'canvas') {
      const frame = page.frameLocator(target.frame || CANVAS_FRAME);
      if (target.waitFor) await expect(frame.getByText(target.waitFor).first()).toBeVisible({ timeout: 60 * 1000 });
    } else if (target.waitFor) {
      await expect(page.getByText(target.waitFor).first()).toBeVisible({ timeout: 60 * 1000 });
    } else {
      await page.waitForLoadState('networkidle').catch(() => {});
    }
  } catch (err) {
    stopIfSignedOut(page, target);
    throw err;
  }
  stopIfSignedOut(page, target);
}

function describe(violation) {
  const where = violation.nodes.slice(0, 3).map(n => n.target.join(' > ')).join('; ');
  return `${violation.id} (${violation.impact}): ${violation.help}. ${violation.nodes.length} place(s), including ${where}. ${violation.helpUrl}`;
}

test.describe('Accessibility, WCAG 2.2 AA', () => {
  test('there is something to test', () => {
    const coverage = text => {
      test.info().annotations.push({ type: 'coverage', description: text });
      if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `**Accessibility tests:** ${text}\n\n`);
    };
    if (all.length === 0) {
      if (process.env.A11Y_BASE_URL) {
        coverage('none run, because tests/accessibility/targets.json lists no pages or screens.');
        throw new Error('A11Y_BASE_URL is set, so there\'s a site to test, but tests/accessibility/targets.json lists no pages or screens. Add each one in the same change that builds it.');
      }
      coverage('none run: there are no pages or screens to test yet.');
      test.skip(true, 'No targets yet: add each page and screen to tests/accessibility/targets.json as you build it.');
    }
    const untested = needSignIn.length ? `; ${needSignIn.length} need a saved sign-in${skipSignedIn ? ' and are skipped (A11Y_SKIP_SIGNED_IN)' : ' and fail until there is one'}` : '';
    coverage(`${targets.length} of ${all.length} target(s) run here${untested}.`);
  });

  for (const target of needSignIn) {
    test(`${target.name}: needs a saved sign-in`, () => {
      test.skip(skipSignedIn, 'A11Y_SKIP_SIGNED_IN is set: the targets that need a sign-in are tested somewhere else, such as on a developer\'s computer.');
      throw new Error('Not tested, so not passed: this target needs a saved sign-in. Run npm run test:a11y:login with a test account, then run the tests again.');
    });
  }

  for (const target of targets) {
    const skip = new Set(target.skip || []);

    test(`${target.name}: no axe violations`, async ({ page }) => {
      await open(page, target);
      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      let violations = results.violations;
      if (target.type === 'canvas') {
        const frame = target.frame || CANVAS_FRAME;
        violations = violations
          .map(v => ({ ...v, nodes: v.nodes.filter(n => n.target.length > 1 && n.target[0] === frame) }))
          .filter(v => v.nodes.length);
      }
      expect(violations.map(describe), 'WCAG 2.2 A and AA violations, any impact').toEqual([]);
    });

    if (target.type !== 'canvas' && target.type !== 'model-driven' && !skip.has('reflow')) {
      test(`${target.name}: reflows at 320 pixels`, async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 640 });
        await open(page, target);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, 'sideways scrolling in CSS pixels (WCAG 1.4.10)').toBeLessThanOrEqual(1);
      });
    }

    if (target.type !== 'canvas' && target.type !== 'model-driven' && !skip.has('focus')) {
      test(`${target.name}: visible focus on every tab stop`, async ({ page }) => {
        await open(page, target);
        const missing = [];
        const seen = new Set();
        for (let i = 0; i < (target.tabStops || 40); i++) {
          await page.keyboard.press('Tab');
          const info = await page.evaluate(() => {
            const el = document.activeElement;
            if (!el || el === document.body) return null;
            const s = getComputedStyle(el);
            const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 && !/rgba\([^)]*,\s*0\)|transparent/.test(s.outlineColor);
            const shadow = s.boxShadow && s.boxShadow !== 'none';
            const label = (el.getAttribute('aria-label') || el.innerText || el.getAttribute('name') || el.id || '').trim().replace(/\s+/g, ' ').slice(0, 50);
            return { key: `${el.tagName}|${label}|${el.getBoundingClientRect().top}`, tag: el.tagName.toLowerCase(), label, visible: Boolean(outline || shadow) };
          });
          if (!info || seen.has(info.key)) break;
          seen.add(info.key);
          if (!info.visible) missing.push(`${info.tag} "${info.label}"`);
        }
        expect(missing, 'tab stops without a visible focus indicator (WCAG 2.4.7)').toEqual([]);
      });
    }
  }
});
