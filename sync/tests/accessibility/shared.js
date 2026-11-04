'use strict';
// Shared settings for the Bexley accessibility tests and the sign-in helper.
//
// Synced into each app repository at .lbbexley/standards/tests/accessibility/
// from the standards repository (sync/tests/accessibility/). Don't edit the
// copy in an app repository: change it in the standards repository and release.
//
// What a service owns stays in its own repository: the list of pages and
// screens (tests/accessibility/targets.json) and the saved sign-in (.auth/).

const fs = require('fs');
const path = require('path');

// The app repository's root: four levels up from .lbbexley/standards/tests/accessibility/.
const ROOT = process.env.A11Y_ROOT ? path.resolve(process.env.A11Y_ROOT) : path.resolve(__dirname, '..', '..', '..', '..');
const TARGETS = path.join(ROOT, 'tests', 'accessibility', 'targets.json');
const STATE = path.join(ROOT, '.auth', 'a11y-state.json');
const CANVAS_FRAME = 'iframe[name="fullscreen-app-host"]';

// WCAG 2.0, 2.1 and 2.2, levels A and AA.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// Sign-in pages: Microsoft's, and Power Pages' own (/SignIn, Azure AD B2C).
const SIGN_IN_PAGE = /login\.(microsoftonline|live|windows)\.(com|net)|\.b2clogin\.com\/|\/SignIn\b/i;

function loadTargets() {
  if (!fs.existsSync(TARGETS)) return [];
  const data = JSON.parse(fs.readFileSync(TARGETS, 'utf8'));
  return Array.isArray(data.targets) ? data.targets : [];
}

function absoluteUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  const base = process.env.A11Y_BASE_URL;
  if (!base) throw new Error(`"${url}" is a path, so A11Y_BASE_URL must be set (for example https://your-site.powerappsportals.com)`);
  return new URL(url, base.endsWith('/') ? base : `${base}/`).toString();
}

module.exports = { ROOT, TARGETS, STATE, CANVAS_FRAME, WCAG_TAGS, SIGN_IN_PAGE, loadTargets, absoluteUrl };
