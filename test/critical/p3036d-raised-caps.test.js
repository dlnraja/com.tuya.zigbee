'use strict';
// P3036d (owner decision 25/10/2026 17:29 Paris, rule 17:31): the unified cap goes up to the highest safe
// value of the real Athom bound (the uploaded app.json size: <= 90 % of the 3.93 MB accepted), checked on
// the final upload; the coverage tier puts back compacted couples one exact mfr+pid couple at a time.
// Never per manufacturer alone: no manufacturer leaves a driver because it exists elsewhere, and case
// forms carrying different productIds are never merged.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('../_support/dual-runner'); // P3020: node --test and mocha

const ROOT = path.join(__dirname, '..', '..');
const K = require(path.join(ROOT, 'scripts', 'maintenance', 'kb-couple-topup.cjs'));
const L = require(path.join(ROOT, 'scripts', 'lib', 'publish-caps.cjs'));
const CAPS = L.loadPublishCaps({ root: ROOT, env: {} });
const clone = (o) => JSON.parse(JSON.stringify(o));
const drv = (id, m, p) => ({ id, zigbee: { manufacturerName: m, productId: p } });

describe('P3036d raised caps, upload size bound, per-couple coverage top-up', () => {
  it('config: upload cap <= 90 % of the largest accepted app.json, combos <= 90 % of the only rejection, rollback recorded', () => {
    const m = CAPS.measured;
    assert.ok(CAPS.maxUploadAppJsonBytes > 0 && CAPS.maxUploadAppJsonBytes <= 0.9 * m.acceptedMaxUploadAppJsonBytes);
    assert.ok(L.payloadCeiling(CAPS) <= 0.9 * m.rejectedMinTotalCombos);
    const d = L.readFile(ROOT).decision;
    assert.strictEqual(d.id, 'P3036d');
    assert.ok(d.rollback.caps.maxTotalCombos > 0);
  });

  it('prepare-publish: final gate on the uploaded app.json, coverage log, top-ups follow the decision', () => {
    const s = fs.readFileSync(path.join(ROOT, 'scripts/prepare-publish.js'), 'utf8');
    assert.match(s, /FATAL\(P3036d\): uploaded app\.json/);
    assert.match(s, /publishCaps\.maxUploadAppJsonBytes/);
    assert.match(s, /allowUnmeasured: !!publishCaps\.allowAboveMeasuredCombos/);
    assert.ok(s.indexOf('FATAL(P3036d)') > s.indexOf('FATAL(P3036b)'), 'final gate after the top-ups');
  });

  it('coverage tier adds the exact couple on its declaring driver, removes nothing', () => {
    const source = { drivers: [drv('a', ['M1', 'M2'], ['P1', 'P2']), drv('b', ['M2'], ['P3'])] };
    const payload = { drivers: [drv('a', ['M1'], ['P1']), drv('b', ['M2'], ['P3'])] };
    const r = K.topUp(source, payload, { maxTotal: 100, maxDriver: 100, kb: new Set(), priority: new Set(), coverage: new Set(['M2|P2']) });
    assert.deepStrictEqual(r.coverage.restored, ['M2|P2@a']);
    assert.deepStrictEqual(payload.drivers[0].zigbee, { manufacturerName: ['M1', 'M2'], productId: ['P1', 'P2'] });
    assert.deepStrictEqual(payload.drivers[1].zigbee, { manufacturerName: ['M2'], productId: ['P3'] }, 'mfr present elsewhere stays');
  });

  it('byte-exact only: another case form with another productId is not merged nor placed', () => {
    const source = { drivers: [drv('a', ['_TZE200_abc', '_tze200_abc'], ['TS0601', 'ts0601'])] };
    const payload = { drivers: [drv('a', ['_TZE200_abc'], ['TS0601'])] };
    const before = clone(payload);
    const r = K.topUp(source, payload, { maxTotal: 100, maxDriver: 100, kb: new Set(), priority: new Set(), coverage: new Set(['_TZE200_ABC|TS0601']) });
    assert.strictEqual(r.coverage.notPlaceable, 1);
    assert.deepStrictEqual(payload, before);
    const r2 = K.topUp(source, payload, { maxTotal: 100, maxDriver: 100, kb: new Set(), priority: new Set(), coverage: new Set(['_tze200_abc|ts0601']) });
    assert.deepStrictEqual(r2.coverage.restored, ['_tze200_abc|ts0601@a']);
    assert.deepStrictEqual(payload.drivers[0].zigbee.manufacturerName, ['_TZE200_abc', '_tze200_abc']);
    assert.deepStrictEqual(payload.drivers[0].zigbee.productId, ['TS0601', 'ts0601']);
  });

  it('ceilings still bind: no room means the couple stays out, nothing else changes', () => {
    const source = { drivers: [drv('a', ['M1', 'M2'], ['P1', 'P2'])] };
    const payload = { drivers: [drv('a', ['M1'], ['P1'])] };
    const before = clone(payload);
    const r = K.topUp(source, payload, { maxTotal: 2, maxDriver: 100, kb: new Set(), priority: new Set(), coverage: new Set(['M2|P2']) });
    assert.strictEqual(r.coverage.noRoom, 1);
    assert.deepStrictEqual(payload, before);
  });

  it('coverage keys come from the matrix or its snapshot (exact mfr|pid)', () => {
    const s = K.loadCoverageCompacted(ROOT);
    for (const k of s) assert.ok(k.lastIndexOf('|') > 0, k);
  });
});
