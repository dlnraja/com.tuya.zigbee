'use strict';

/**
 * Test smart-update-orchestrator + token-sanity-check (P58.3)
 *
 * Run with: node tools/ci/test-orchestrator.js
 */

const assert = require('assert');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}\n      ${err.message}`);
  }
}

console.log('=== Smart Update Orchestrator + Token Sanity tests ===');

const { getSourcePlan, FRESH_WINDOWS_MS } = require(path.join(ROOT, 'tools/ci/smart-update-orchestrator.js'));

test('FRESCH_WINDOWS_MS has 15 sources', () => {
  assert.strictEqual(Object.keys(FRESH_WINDOWS_MS).length, 15);
});

test('getSourcePlan returns valid plan shape', () => {
  const plan = getSourcePlan();
  assert.ok(Array.isArray(plan.skip));
  assert.ok(Array.isArray(plan.run));
  assert.strictEqual(plan.skip.length + plan.run.length, 15);
  assert.ok(typeof plan.reason === 'object');
});

test('every source has a reason', () => {
  const plan = getSourcePlan();
  for (const s of [...plan.skip, ...plan.run]) {
    assert.ok(plan.reason[s], `missing reason for ${s}`);
  }
});

test('sources are partitioned (no overlap)', () => {
  const plan = getSourcePlan();
  for (const s of plan.skip) {
    assert.ok(!plan.run.includes(s), `${s} in both skip and run`);
  }
  for (const s of plan.run) {
    assert.ok(!plan.skip.includes(s), `${s} in both run and skip`);
  }
});

test('FRESH_WINDOWS_MS values are positive', () => {
  for (const [k, v] of Object.entries(FRESH_WINDOWS_MS)) {
    assert.ok(v > 0, `${k} has non-positive window: ${v}`);
  }
});

test('Stable/Conservative sources have longer windows than active', () => {
  assert.ok(FRESH_WINDOWS_MS['csa-iot'] > FRESH_WINDOWS_MS.gmail, 'csa-iot should be longer than gmail');
  assert.ok(FRESH_WINDOWS_MS.deconz > FRESH_WINDOWS_MS.forum, 'deconz should be longer than forum');
});

test('email/gmail has shortest window (most active)', () => {
  const min = Math.min(...Object.values(FRESH_WINDOWS_MS));
  assert.strictEqual(min, FRESH_WINDOWS_MS.gmail);
});

// token sanity
const { TOKEN_CHECKS, isAvailable } = require(path.join(ROOT, 'tools/ci/token-sanity-check.js'));

test('TOKEN_CHECKS has 8 entries', () => {
  assert.strictEqual(TOKEN_CHECKS.length, 8);
});

test('isAvailable returns false for null', () => {
  assert.strictEqual(isAvailable({}), false);
});

test('isAvailable returns true for env var with value', () => {
  process.env._TEST_TOKEN = 'abc';
  assert.strictEqual(isAvailable({ envCheck: '_TEST_TOKEN' }), true);
  delete process.env._TEST_TOKEN;
});

test('isAvailable returns false for empty env var', () => {
  process.env._TEST_EMPTY = '';
  assert.strictEqual(isAvailable({ envCheck: '_TEST_EMPTY' }), false);
  delete process.env._TEST_EMPTY;
});

test('orchestrator does not throw on missing state files', () => {
  // The orchestrator should gracefully handle missing state files
  // (i.e., return a plan with everything in "run")
  const plan = getSourcePlan();
  assert.ok(plan);
});

test('JSON output mode works', () => {
  const { spawnSync } = require('child_process');
  const r = spawnSync('node', [
    path.join(ROOT, 'tools/ci/smart-update-orchestrator.js'),
    '--json', '--silent'
  ], { encoding: 'utf8' });
  const parsed = JSON.parse(r.stdout);
  assert.ok(Array.isArray(parsed.skip));
  assert.ok(Array.isArray(parsed.run));
});

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
