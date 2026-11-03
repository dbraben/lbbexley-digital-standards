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
const { STATE, loadTargets, absoluteUrl } = require('./shared');

(async () => {
  const targets = loadTargets().filter(t => t.auth);
  if (!targets.length) {
    process.stdout.write('No targets need signing in to (auth: true in tests/accessibility/targets.json).\n');
    return;
  }
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ locale: 'en-GB' });
  const page = await context.newPage();
  for (const target of targets) {
    process.stdout.write(`Opening ${target.name}. Sign in with your test account if asked (you have 5 minutes).\n`);
    await page.goto(absoluteUrl(target.url));
    await page.waitForURL(u => !/login\.(microsoftonline|live|windows)\.(com|net)/i.test(u.toString()), { timeout: 5 * 60 * 1000 });
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  fs.mkdirSync(path.dirname(STATE), { recursive: true });
  await context.storageState({ path: STATE });
  await browser.close();
  process.stdout.write(`Saved the sign-in to ${path.relative(process.cwd(), STATE)}. It's git-ignored: never commit or share it.\n`);
})().catch(err => {
  process.stderr.write(`${err.message}\n`);
  process.exitCode = 1;
});
