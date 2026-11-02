'use strict';
// P3206 (02/11/2026 Paris): P3024b baseline narrowed to source-backed couples (canonical + one sourced alternate),
// canonical vendor prefix, zero-cost form normalisation, and the driver continuation registry/check.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const psr = require('../../scripts/maintenance/publish-sourced-restore.cjs');
const cz = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');
const { checkBaseline } = require('../../scripts/maintenance/publish-baseline-gate.cjs');
const DC = require('../../lib/drivers/DriverContinuations');
const { check } = require('../../scripts/ci/driver-continuations-check.js');

const src = (forms) => { const m = new Map(); for (const [mf, pf] of forms) {m.set(psr.keyOf(mf[0], pf[0]), { mfrForms: new Set(mf), pidForms: new Set(pf) });} return m; };

describe('P3206 baseline narrowing + driver continuations', () => {
  it('canonical vendor prefix is the first segment', () => {
    assert.strictEqual(psr.canonicalMfr('_tz3210_DSE8OGFY_fingerbot'), '_TZ3210_dse8ogfy_fingerbot');
    assert.strictEqual(psr.canonicalMfr('_tz3000_C8OZAH8N'), '_TZ3000_c8ozah8n');
    assert.strictEqual(psr.canonicalMfr('eWeLink'), 'eWeLink');
  });

  it('narrows to sourced couples: canonical primary, shipped fallback, one quoted alternate', () => {
    const baseline = { version: 't', drivers: {
      a: { m: ['_TZ3000_aaaa', '_tz3000_AAAA', '_TZ3000_zzzz'], p: ['TS0001'] },
      b: { m: ['_TZ3000_C8OZAH8N'], p: ['TS0202'] },
    } };
    Object.defineProperty(baseline, '_sourced', { enumerable: false, value: { psr, map: src([
      [['_TZ3000_aaaa', '_tz3000_AAAA'], ['TS0001']],
      [['_TZ3000_c8ozah8n'], ['TS0202']],
    ]) } });
    const c = cz.narrowBaselineCouples(baseline);
    assert.deepStrictEqual(c.filter((x) => x.driverId === 'a').map((x) => x.mfr), ['_TZ3000_aaaa', '_tz3000_AAAA']);
    const b = c.find((x) => x.driverId === 'b');
    assert.strictEqual(b.mfr, '_TZ3000_c8ozah8n');
    assert.deepStrictEqual(b.fallback, { mfr: '_TZ3000_C8OZAH8N', pid: 'TS0202' });
    assert.ok(!c.some((x) => x.mfr === '_TZ3000_zzzz'), 'unsourced couple not enforced');
    const drv = (id, m, p) => ({ id, zigbee: { manufacturerName: m, productId: p } });
    const man = { drivers: [drv('a', ['_TZ3000_aaaa', '_tz3000_AAAA'], ['TS0001']), drv('b', ['_TZ3000_C8OZAH8N'], ['TS0202'])] };
    assert.deepStrictEqual(checkBaseline(man, baseline).missing, [], 'fallback form satisfies the gate');
  });

  it('normalizeForms renames an unquoted non-canonical form only', () => {
    const man = { drivers: [{ id: 'd', zigbee: { manufacturerName: ['_tz3000_bbbb', '_tz3000_QQ'], productId: ['ts0001'] } }] };
    const n = psr.normalizeForms(man, src([[['_tz3000_QQ'], ['TS0001']]]), new Set(), new Set());
    assert.ok(n >= 2);
    assert.deepStrictEqual(man.drivers[0].zigbee.manufacturerName, ['_TZ3000_bbbb', '_tz3000_QQ']);
    assert.deepStrictEqual(man.drivers[0].zigbee.productId, ['TS0001']);
  });

  it('continuation resolver: chain, root, first non-full', () => {
    const r = DC.fromObject({ drivers: { x: { full: true, continuation: 'x_2' }, x_2: { continuationOf: 'x', index: 2 } } });
    assert.deepStrictEqual(r.chainOf('x_2'), ['x', 'x_2']);
    assert.strictEqual(r.rootOf('x_2'), 'x');
    assert.strictEqual(r.firstNonFull('x'), 'x_2');
    assert.strictEqual(r.firstNonFull('plain'), 'plain');
    assert.ok(r.isSameLogical('x', 'x_2'));
  });

  it('CI check: real registry clean, broken links detected', () => {
    const root = path.join(__dirname, '..', '..');
    assert.deepStrictEqual(check(root).errors, []);
    const bad = check(root, { drivers: { x: { full: true, continuation: 'x_2' }, x_2: { continuationOf: 'y', index: 3 } } });
    assert.ok(bad.errors.length >= 2, bad.errors.join('; '));
  });

  it('rules-gates core runs the continuation check', () => {
    const src = require('fs').readFileSync(path.join(__dirname, '..', '..', 'scripts', 'ci', 'rules-gates.js'), 'utf8');
    assert.ok(/driver-continuations-check\.js/.test(src));
  });
});
