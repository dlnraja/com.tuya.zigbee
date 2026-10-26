'use strict';
/**
 * P3057-3: node22-tests.yml fails on node:test failures (strict runner + frozen baseline ratchet).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const S = require('../../tools/ci/node-test-strict');

describe('P3057-3 node:test strict runner', () => {
  it('detects node:test files and ignores mocha-only ones', () => {
    assert.ok(S.NODE_TEST_RE.test("const { describe } = require('node:test');"));
    assert.ok(S.NODE_TEST_RE.test("import { test } from 'node:test';"));
    assert.ok(!S.NODE_TEST_RE.test("const { expect } = require('chai');"));
  });

  it('a new failure fails, a baselined one is tolerated, a passing baselined one is stale', () => {
    const failures = [{ file: 'test/a.test.js', name: 'x' }, { file: 'test/b.test.js', name: 'y' }];
    const r = S.evaluate(failures, ['test/b.test.js::y', 'test/c.test.js::z', 'test/gone.test.js::w'], ['test/a.test.js', 'test/b.test.js', 'test/c.test.js']);
    assert.equal(r.ok, false);
    assert.deepEqual(r.unexpected, ['test/a.test.js::x']);
    assert.deepEqual(r.tolerated, ['test/b.test.js::y']);
    assert.deepEqual(r.stale, ['test/c.test.js::z']);
    assert.equal(S.evaluate([], [], []).ok, true);
  });

  it('end to end: a failing node:test file makes the runner exit 1, a passing one exits 0', () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'p3057-3-'));
    const bad = path.join(d, 'bad.test.js');
    const good = path.join(d, 'good.test.js');
    fs.writeFileSync(bad, "const { it } = require('node:test'); it('boom', () => { throw new Error('x'); });\n");
    fs.writeFileSync(good, "const { it } = require('node:test'); it('fine', () => {});\n");
    const run = (f, base) => spawnSync(process.execPath, [path.join(ROOT, 'tools/ci/node-test-strict.js'), '--out', path.join(d, 'o.jsonl'), '--baseline', base || path.join(d, 'none.json'), f], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(run(good).status, 0);
    const r = run(bad);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /::error::node:test failure: .*bad\.test\.js::boom/);
    const relBad = path.relative(ROOT, bad).split(path.sep).join('/');
    const base = path.join(d, 'base.json');
    fs.writeFileSync(base, JSON.stringify({ knownFailures: [`${relBad}::boom`] }));
    assert.equal(run(bad, base).status, 0);
  });

  it('node22-tests.yml runs the strict step (not mocha only)', () => {
    const y = fs.readFileSync(path.join(ROOT, '.github/workflows/node22-tests.yml'), 'utf8');
    assert.match(y, /node tools\/ci\/node-test-strict\.js/);
    assert.ok(!/node-test-strict[^\n]*\|\|\s*true/.test(y), 'strict step must not be neutralised');
    assert.ok(!/continue-on-error:\s*true/.test(y), 'no continue-on-error in node22-tests');
  });

  it('the baseline is a frozen list of file::name keys whose files exist', () => {
    const f = path.join(ROOT, 'test', 'node-test-known-failures.json');
    if (!fs.existsSync(f)) {return;}
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    assert.ok(Array.isArray(j.knownFailures));
    assert.ok(j.knownFailures.length <= (j.maxEntries ?? j.knownFailures.length), 'baseline may only shrink');
    for (const k of j.knownFailures) {
      const [file, name] = k.split('::');
      assert.ok(file && name, `bad key ${k}`);
      assert.ok(fs.existsSync(path.join(ROOT, file)), `baseline file missing: ${file}`);
    }
  });
});
