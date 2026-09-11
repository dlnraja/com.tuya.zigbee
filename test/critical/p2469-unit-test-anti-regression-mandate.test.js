'use strict';

/**
 * P2469 — Unit-test anti-régression mandate (always-on)
 * Contre quoi: agents ship fixes without critical tests / without Cursor rule.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

assert.ok(exists('.cursor/rules/unit-test-anti-regression-always.mdc'),
  'P2469: alwaysApply Cursor rule missing');
const rule = readText('.cursor/rules/unit-test-anti-regression-always.mdc');
assert.ok(/alwaysApply:\s*true/.test(rule), 'P2469: rule must be alwaysApply');
assert.ok(rule.includes('P2469'), 'P2469 marker in rule');
assert.ok(/every prompt/i.test(rule) || /chaque prompt/i.test(rule),
  'P2469: every-prompt mandate');
assert.ok(rule.includes('test/critical'), 'P2469: points at test/critical');

assert.ok(exists('docs/rules/UNIT_TEST_ANTI_REGRESSION.md'),
  'P2469: doctrine doc missing');
const doctrine = readText('docs/rules/UNIT_TEST_ANTI_REGRESSION.md');
assert.ok(doctrine.includes('Contre quoi'), 'P2469: Contre quoi in doctrine');

assert.ok(exists('test/critical/p2468-joep-frankever-vichy.test.js'),
  'P2469: P2468 critical test must remain (example lock)');
assert.ok(exists('test/critical/p2467-moes-ef00-initialize.test.js'),
  'P2469: P2467 critical test must remain (example lock)');

const pkg = JSON.parse(readText('package.json'));
const scripts = pkg.scripts || {};
assert.ok(scripts['check:p2468'], 'P2469: npm run check:p2468');
assert.ok(scripts['check:p2469'], 'P2469: npm run check:p2469');
assert.ok(scripts['check:p246x'], 'P2469: npm run check:p246x family');

const cursorrules = readText('.cursorrules');
assert.ok(/P2469|unit-test-anti-regression|UNIT_TEST_ANTI_REGRESSION/i.test(cursorrules),
  'P2469: .cursorrules must mention anti-regression unit-test mandate');

const mandate = readText('AI_CONTEXT_MANDATE.md');
assert.ok(/P2469|UNIT_TEST_ANTI_REGRESSION|unit.test.*anti.?r[eé]gression/i.test(mandate),
  'P2469: AI_CONTEXT_MANDATE (system prompt) must mention unit-test mandate');

console.log('P2469 unit-test anti-regression mandate: PASS');
