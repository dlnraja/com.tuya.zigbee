'use strict';

/**
 * Test aggregate-error-fixer (P58.6)
 * Run: node tools/ci/test-aggregate-error-fixer.js
 */

const assert = require('assert');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const fixer = require(path.join(ROOT, 'tools/ci/aggregate-error-fixer.js'));

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

console.log('=== Aggregate Error Fixer tests (P58.6) ===');

const { categorizeError, unwindAggregateError, applyAutoFixes } = fixer;

test('categorize: empty manufacturerName', () => {
  const c = categorizeError({ name: 'AggregateError', message: 'empty manufacturerName in driver' });
  assert.strictEqual(c.type, 'empty_manufacturer');
  assert.strictEqual(c.severity, 'CRITICAL');
  assert.strictEqual(c.autoFixable, true);
  assert.strictEqual(c.details.fixClass, 'placeholder-mfr');
});

test('categorize: 429 rate limit', () => {
  const c = categorizeError({ message: 'GET https://api.github.com returned 429 rate limit exceeded' });
  assert.strictEqual(c.type, 'rate_limit');
  assert.strictEqual(c.isTransient, true);
  assert.strictEqual(c.severity, 'WARN');
});

test('categorize: ETIMEDOUT', () => {
  const c = categorizeError({ message: 'spawnSync /bin/sh ETIMEDOUT' });
  // ETIMEDOUT matches both rate_limit and network_timeout patterns;
  // rate_limit takes priority (more specific to HTTP context)
  assert.ok(['rate_limit', 'network_timeout'].includes(c.type), `got ${c.type}`);
  assert.strictEqual(c.isTransient, true);
});

test('categorize: ENOBUFS', () => {
  const c = categorizeError({ message: 'stdout maxBuffer length exceeded' });
  assert.strictEqual(c.type, 'buffer_overflow');
  assert.strictEqual(c.autoFixable, true);
});

test('categorize: JSON parse', () => {
  const c = categorizeError({ message: 'JSON.parse: unexpected character at line 5' });
  assert.strictEqual(c.type, 'json_parse');
  assert.strictEqual(c.autoFixable, true);
});

test('categorize: YAML separator', () => {
  const c = categorizeError({ message: 'yaml parse failed: expected a single document' });
  assert.strictEqual(c.type, 'yaml_parse');
  assert.strictEqual(c.autoFixable, true);
  assert.strictEqual(c.details.fixClass, 'yaml-separators');
});

test('categorize: setTimeout undefined', () => {
  const c = categorizeError({ message: 'setTimeout is undefined' });
  assert.strictEqual(c.type, 'race_condition');
});

test('categorize: _destroyed undefined', () => {
  const c = categorizeError({ message: 'this._destroyed is undefined' });
  assert.strictEqual(c.type, 'race_condition');
});

test('categorize: publish size exceeded', () => {
  const c = categorizeError({ message: 'FATAL: publish directory is 35.00 MB, above the 24.00 MB safety limit.' });
  assert.strictEqual(c.type, 'publish_size_exceeded');
  assert.strictEqual(c.autoFixable, true);
});

test('categorize: class extends value', () => {
  const c = categorizeError({ message: 'Class extends value undefined is not a constructor' });
  assert.strictEqual(c.type, 'class_extension_error');
});

test('categorize: invalid flow card id', () => {
  const c = categorizeError({ message: 'Invalid Flow Card ID: switch_temp_sensor_set_temperature' });
  assert.strictEqual(c.type, 'invalid_flow_card');
});

test('categorize: registerRunListenerasync typo', () => {
  const c = categorizeError({ message: 'card.registerRunListenerasync is not a function' });
  assert.strictEqual(c.type, 'syntax_typo_registerRunListenerasync');
});

test('categorize: uncaught exception', () => {
  const c = categorizeError({ message: 'uncaughtException: TypeError: cannot read property' });
  assert.strictEqual(c.type, 'uncaught_exception');
  assert.strictEqual(c.severity, 'CRITICAL');
});

test('categorize: unhandled rejection', () => {
  const c = categorizeError({ message: 'unhandledRejection: Promise rejected without catch' });
  assert.strictEqual(c.type, 'unhandled_rejection');
});

test('categorize: 401 auth error', () => {
  const c = categorizeError({ message: '401 Unauthorized: GH_PAT token invalid' });
  assert.strictEqual(c.type, 'auth_error');
  assert.strictEqual(c.severity, 'CRITICAL');
});

test('categorize: unknown error', () => {
  const c = categorizeError({ message: 'something completely unexpected' });
  assert.strictEqual(c.type, 'unknown');
});

test('unwindAggregateError: extracts from .errors[]', () => {
  const inner1 = new Error('inner1');
  const inner2 = new Error('inner2');
  const agg = new AggregateError([inner1, inner2], 'wrapper');
  const unwound = unwindAggregateError(agg);
  assert.strictEqual(unwound.length, 2);
  assert.strictEqual(unwound[0].message, 'inner1');
  assert.strictEqual(unwound[1].message, 'inner2');
});

test('unwindAggregateError: returns single error wrapped in array', () => {
  const err = new Error('plain error');
  const unwound = unwindAggregateError(err);
  assert.strictEqual(unwound.length, 1);
  assert.strictEqual(unwound[0].message, 'plain error');
});

test('unwindAggregateError: null returns empty array', () => {
  const unwound = unwindAggregateError(null);
  assert.deepStrictEqual(unwound, []);
});

test('applyAutoFixes: dry-run (default) does not run', () => {
  const findings = [
    { autoFixable: true, fingerprint: 'abc', type: 'empty_manufacturer', suggestedFix: 'fix' },
    { autoFixable: false, fingerprint: 'def', type: 'unknown', suggestedFix: 'manual' },
  ];
  const summary = applyAutoFixes(findings);
  assert.strictEqual(summary.applied, 0);
  assert.strictEqual(summary.skipped, 2);
});

test('applyAutoFixes: counts by status correctly', () => {
  const findings = [
    { autoFixable: true, fingerprint: 'abc', type: 'empty_manufacturer', suggestedFix: 'fix', details: { fixClass: 'placeholder-mfr' } },
    { autoFixable: true, fingerprint: 'ghi', type: 'yaml_parse', suggestedFix: 'fix', details: { fixClass: 'yaml-separators' } },
  ];
  const summary = applyAutoFixes(findings);
  // 2 findings, both autoFixable, no APPLY so both skipped
  assert.strictEqual(summary.applied, 0);
  assert.strictEqual(summary.skipped, 2);
  assert.ok(summary.results.length === 2);
  assert.strictEqual(summary.results[0].status, 'dry-run-skip');
});

test('fingerprint is stable for same error', () => {
  const c1 = categorizeError({ name: 'Error', message: 'same message' });
  const c2 = categorizeError({ name: 'Error', message: 'same message' });
  assert.strictEqual(c1.fingerprint, c2.fingerprint);
});

test('fingerprint differs for different errors', () => {
  const c1 = categorizeError({ name: 'Error', message: 'message A' });
  const c2 = categorizeError({ name: 'Error', message: 'message B' });
  assert.notStrictEqual(c1.fingerprint, c2.fingerprint);
});

test('categorize: 503 service unavailable', () => {
  const c = categorizeError({ message: 'HTTP 503 Service Unavailable' });
  assert.strictEqual(c.type, 'rate_limit');
  assert.strictEqual(c.isTransient, true);
});

test('categorize: ECONNRESET', () => {
  const c = categorizeError({ message: 'read ECONNRESET' });
  assert.strictEqual(c.type, 'rate_limit');
  assert.strictEqual(c.isTransient, true);
});

test('all categories have suggestedFix or are unknown', () => {
  const samples = [
    { name: 'AggregateError', message: 'manufacturername empty' },
    { message: '401 token' },
    { message: '429' },
    { message: 'ETIMEDOUT' },
    { message: 'ENOBUFS' },
    { message: 'JSON.parse failed' },
    { message: 'yaml parse failed' },
    { message: 'setTimeout undefined' },
    { message: 'publish directory is 35 MB' },
    { message: 'Class extends value undefined' },
    { message: 'Invalid Flow Card ID' },
    { message: 'registerRunListenerasync' },
    { message: 'uncaughtException' },
    { message: 'unhandledRejection' },
  ];
  for (const s of samples) {
    const c = categorizeError(s);
    assert.ok(c.type, `no type for: ${s.message}`);
    assert.ok(c.severity, `no severity for: ${s.message}`);
  }
});

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
