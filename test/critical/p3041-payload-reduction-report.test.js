'use strict';
// P3041 (25/10/2026 Paris): reproducible payload measure (bytes, combos, twins, TS0601 carrier simulation).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const { report, carrierSimulation } = require('../../scripts/maintenance/payload-reduction-report.cjs');

describe('P3041 payload reduction report', () => {
  const manifest = {
    flow: { triggers: [{ id: 'a_x', title: { en: 'x' }, args: [{ name: 'device', type: 'device', filter: 'driver_id=a' }] },
      { id: 'b_x', title: { en: 'x' }, args: [{ name: 'device', type: 'device', filter: 'driver_id=b' }] }] },
    drivers: [
      { id: 'a', zigbee: { productId: ['TS0601', 'TS0001', 'TS0002'], manufacturerName: ['_TZE200_aa', '_tze200_aa', '_TZ3000_bb'] } },
      { id: 'b', zigbee: { productId: ['TS0601'], manufacturerName: ['_TZE200_cc'] } },
    ],
  };
  it('counts combos, max per driver, twins and case-folded couples', () => {
    const r = report(manifest, { sourced: new Set(), known: new Map(), parasites: false });
    assert.strictEqual(r.combos.total, 10);
    assert.strictEqual(r.combos.maxDriver, 9);
    assert.deepStrictEqual(r.artifactCaseForms, { forms: 1, combos: 3 });
    assert.strictEqual(r.couplesCaseFolded, 7);
    assert.strictEqual(r.flow.cards, 2);
    assert.strictEqual(r.flow.uniqueIgnoringDriver, 1);
    assert.strictEqual(r.bytes, Buffer.byteLength(JSON.stringify(manifest)));
  });
  it('carrier simulation counts only rows a TS0601 couple alone justifies', () => {
    const known = new Map([['_tz3000_bb', new Set(['ts0001'])]]);
    const c = carrierSimulation(manifest, known);
    assert.strictEqual(c.saved, 4); // 2 forms of _tze200_aa x (3 - 1) pids; b is mono-pid
    assert.deepStrictEqual(c.perDriver.map((x) => x.id), ['a']);
  });
});
