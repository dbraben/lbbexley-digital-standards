'use strict';
// For every page and screen in targets.json:
//   - axe finds no WCAG 2.2 A or AA violations, of any impact
//   - pages reflow at 320 CSS pixels with no sideways scrolling (WCAG 1.4.10)
//   - every tab stop on a page shows a visible focus indicator (WCAG 2.4.7)
// Canvas apps are checked inside their app frame, so Microsoft's player around
// them doesn't count against the app.
//
// Synced from the standards repository (sync/tests/accessibility/): don't edit
// the copy in an app repository. The pages and screens come from the app
// repository's tests/accessibility/targets.json.

const fs = require('fs');
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { STATE, CANVAS_FRAME, WCAG_TAGS, loadTargets, absoluteUrl } = require('./shared');

const signedIn = fs.existsSync(STATE);
const all = loadTargets();
const targets = all.filter(t => !t.auth || signedIn);
const waiting = all.length - targets.length;

async function open(page, target) {
  await page.goto(absoluteUrl(target.url), { waitUntil: 'domcontentloaded' });
  if (target.type === 'canvas') {
    const frame = page.frameLocator(target.frame || CANVAS_FRAME);
    if (target.waitFor) await expect(frame.getByText(target.waitFor).first()).toBeVisible({ timeout: 60 * 1000 });
  } else if (target.waitFor) {
    await expect(page.getByText(target.waitFor).first()).toBeVisible({ timeout: 60 * 1000 });
  } else {
    await page.waitForLoadState('networkidle').catch(() => {});
  }
}

function describe(violation) {
  const where = violation.nodes.slice(0, 3).map(n => n.target.join(' > ')).join('; ');
  return `${violation.id} (${violation.impact}): ${violation.help}. ${violation.nodes.length} place(s), including ${where}. ${violation.helpUrl}`;
}

test.describe('Accessibility, WCAG 2.2 AA', () => {
  test('there is something to test', () => {
    if (waiting) test.info().annotations.push({ type: 'warning', description: `${waiting} target(s) need a saved sign-in: run npm run test:a11y:login` });
    test.skip(all.length === 0, 'No targets yet: add each page and screen to tests/accessibility/targets.json as you build it.');
    expect(targets.length, 'targets that can run (sign in with npm run test:a11y:login for the rest)').toBeGreaterThan(0);
  });

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
