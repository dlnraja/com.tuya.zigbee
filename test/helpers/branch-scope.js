'use strict';
/**
 * Mocha root hook (loaded from .mocharc.json): skips tests listed in test/helpers/stable-skip.json
 * when the suite runs on an app id listed there (stable). Skipped tests show as pending with the
 * reason, nothing is deleted, and master runs every test. Override: TEST_BRANCH_SCOPE=master|stable.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
let registry = { appIds: [], skip: {} };
try { registry = JSON.parse(fs.readFileSync(path.join(__dirname, 'stable-skip.json'), 'utf8')); } catch (_e) { /* optional */ }

function currentScope() {
  const forced = String(process.env.TEST_BRANCH_SCOPE || '').toLowerCase();
  if (forced === 'master' || forced === 'stable') return forced;
  try {
    const id = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).id;
    return (registry.appIds || []).includes(id) ? 'stable' : 'master';
  } catch (_e) {
    return 'master';
  }
}

const SCOPE = currentScope();
const SKIP = SCOPE === 'stable' ? registry.skip || {} : {};

exports.mochaHooks = {
  beforeEach() {
    const t = this.currentTest;
    if (!t || !Object.keys(SKIP).length) return;
    const entry = SKIP[t.fullTitle()];
    if (entry) {
      t.title += ` [stable skip: ${entry.why}]`;
      this.skip();
    }
  },
};
exports.SCOPE = SCOPE;
