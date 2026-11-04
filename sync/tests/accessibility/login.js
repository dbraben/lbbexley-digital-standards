'use strict';
// Signs in once in a real browser and saves the session for the accessibility
// tests (targets with auth: true). Use a test account that can only see the
// dev environment and fictional data. The saved file is a secret: it's
// git-ignored, never commit or share it. Run again when the session expires.
//
// Synced from the standards repository (sync/tests/accessibility/): don't edit
// the copy in an app repository.

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const { STATE, SIGN_IN_PAGE, loadTargets, absoluteUrl } = require('./shared');

(async () => {
  const targets = loadTargets().filter(t => t.auth);
  if (!targets.length) {
    process.stdout.write('No targets need signing in to (auth: true in tests/accessibility/targets.json).\n');
    return;
  }
  // Work out every address before a browser opens, so a missing site address
  // is reported straight away.
  let pages;
  try {
    pages = targets.map(t => ({ name: t.name, url: absoluteUrl(t.url) }));
  } catch (err) {
    process.stderr.write([
      err.message,
      'Set it in this terminal, then run this again. In PowerShell: $env:A11Y_BASE_URL = "https://<your-dev-site>.powerappsportals.com"',
      'On a Mac or Linux: export A11Y_BASE_URL="https://<your-dev-site>.powerappsportals.com"',
      'Or give the page\'s full address in tests/accessibility/targets.json.',
    ].join('\n') + '\n');
    process.exitCode = 1;
    return;
  }
  const browser = await chromium.launch({ headless: false });
  try {
    const context = await browser.newContext({ locale: 'en-GB' });
    const page = await context.newPage();
    for (const target of pages) {
      process.stdout.write(`Opening ${target.name}. Sign in with your test account if asked (you have 5 minutes).\n`);
      await page.goto(target.url);
      // Wait until the browser has left every sign-in page, Power Pages' included.
      await page.waitForURL(u => !SIGN_IN_PAGE.test(u.toString()), { timeout: 5 * 60 * 1000 });
      await page.waitForLoadState('networkidle').catch(() => {});
    }
    fs.mkdirSync(path.dirname(STATE), { recursive: true });
    await context.storageState({ path: STATE });
  } finally {
    await browser.close();
  }
  process.stdout.write(`Saved the sign-in to ${path.relative(process.cwd(), STATE)}. It's git-ignored: never commit or share it.\n`);
})().catch(err => {
  process.stderr.write(`${err.message}\n`);
  process.exitCode = 1;
});
