'use strict';
// P3299: every Bastien "Version write-back" step since 07/11 ended at 5 min 13 s with "timed out after 5 minutes"
// (runs 42419142474, 42430488139, 42446976217, 42456300393, 43500313654, 43711569452); continue-on-error showed
// them green and no version was written back. The log shows why: `npm ci` runs the `prepare` script, which sets
// core.hooksPath=.githooks, so the bot's `git push` ran the repo pre-push hook and its full mocha suite (> 5 min).
// The write-back commit only touches version fields + changelog of a commit already green in CI (publish gate);
// it now keeps every fast pre-push gate and skips only the full suite through the documented
// HOOKS_SKIP_FULL_SUITE=1 switch, and each network call is bounded by `timeout`.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const sh = fs.readFileSync(path.join(ROOT, '.github', 'scripts', 'version-writeback.sh'), 'utf8');
const hook = fs.readFileSync(path.join(ROOT, '.githooks', 'pre-push'), 'utf8');

test('the pre-push hook honours HOOKS_SKIP_FULL_SUITE=1 for the full suite only', () => {
  assert.match(hook, /\$\{HOOKS_SKIP_FULL_SUITE:-0\}" != "1"/);
  const idx = hook.indexOf('HOOKS_SKIP_FULL_SUITE:-0');
  assert.ok(hook.indexOf('homey-mandatory-check.js') < idx && hook.indexOf('validate-app-json.js') < idx, 'fast gates run before the suite switch');
});

test('write-back push skips only the full suite, never the hook', () => {
  assert.match(sh, /HOOKS_SKIP_FULL_SUITE=1[^\n]*git push/);
  assert.doesNotMatch(sh, /--no-verify|core\.hooksPath|HOOKS_SKIP_RULES_GATES|HOOKS_SKIP_DATA_GATES/);
});

test('every network call of the write-back is bounded', () => {
  assert.match(sh, /timeout \d+ node scripts\/ci\/homey-build-status\.js/);
  assert.match(sh, /timeout \d+ git fetch/);
  assert.match(sh, /timeout \d+ git push/);
  for (const m of sh.matchAll(/timeout (\d+) /g)) { assert.ok(Number(m[1]) <= 150, `timeout ${m[1]}s`); }
});

test('the script still parses (bash -n)', () => {
  const r = spawnSync('bash', ['-n', path.join(ROOT, '.github', 'scripts', 'version-writeback.sh')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
});
