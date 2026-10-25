'use strict';
// P3036: additive TS0601 top-up after the publish compaction (scripts/maintenance/ts0601-topup.cjs).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const T = require('../../scripts/maintenance/ts0601-topup.cjs');
const C = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');

const ROOT = path.resolve(__dirname, '../..');
const drv = (id, mfrs, pids) => ({ id, zigbee: { manufacturerName: mfrs, productId: pids } });
const clone = (o) => JSON.parse(JSON.stringify(o));

function fixture() {
  const source = { drivers: [
    drv('climate', ['_TZE200_aaaa0001', '_TZE200_bbbb0002', '_TZE200_cccc0003', '_TZE200_CCCC0003', '_tze200_cccc0003'], ['TS0601', 'TS0201', 'TS0222']),
    drv('curtain', ['_TZE200_dddd0004', '_TZE200_bbbb0002', '_TZE200_eeee0005'], ['TS0601']),
    drv('plug', ['_TZ3000_ffff0006'], ['TS011F']),
    drv('hidden', ['_TZE200_gggg0007'], ['TS0601']),
    drv('noTs', ['_TZE200_hhhh0008'], ['TS0601']),
  ] };
  const payload = { drivers: [
    drv('climate', ['_TZE200_aaaa0001'], ['TS0601', 'TS0201', 'TS0222']),
    drv('curtain', ['_TZE200_dddd0004'], ['TS0601']),
    drv('plug', ['_TZ3000_ffff0006'], ['TS011F']),
    drv('noTs', ['_TZE200_zzzz9999'], ['TS0201']),
  ] };
  return { source, payload };
}

describe('P3036 TS0601 top-up (additive, measured ceiling)', () => {
  it('adds only missing (mfr, TS0601) groups, on the cheapest payload driver that lists them', () => {
    const { source, payload } = fixture();
    const r = T.topUp(source, payload, { maxTotal: 1000, maxCaseForms: 2 });
    const curtain = payload.drivers.find((d) => d.id === 'curtain').zigbee.manufacturerName;
    const climate = payload.drivers.find((d) => d.id === 'climate').zigbee.manufacturerName;
    assert.ok(curtain.includes('_TZE200_bbbb0002'), 'bbbb goes to curtain (1 pid) rather than climate (3 pids)');
    assert.ok(!climate.includes('_TZE200_bbbb0002'));
    assert.ok(curtain.includes('_TZE200_eeee0005'));
    assert.strictEqual(climate.filter((m) => m.toLowerCase() === '_tze200_cccc0003').length, 2, 'at most 2 case forms');
    assert.strictEqual(r.driversAfter, r.driversBefore);
    assert.strictEqual(r.afterTotal, T.totalCombos(payload));
  });
  it('never removes an identifier, never adds a driver or a productId', () => {
    const { source, payload } = fixture();
    const before = clone(payload);
    T.topUp(source, payload, { maxTotal: 1000 });
    assert.deepStrictEqual(payload.drivers.map((d) => d.id), before.drivers.map((d) => d.id));
    for (const b of before.drivers) {
      const a = payload.drivers.find((d) => d.id === b.id);
      assert.deepStrictEqual(a.zigbee.productId, b.zigbee.productId);
      for (const m of b.zigbee.manufacturerName) assert.ok(a.zigbee.manufacturerName.includes(m));
    }
    const all = payload.drivers.flatMap((d) => d.zigbee.manufacturerName);
    assert.ok(!all.includes('_TZE200_gggg0007'), 'driver absent from the payload is not re-added');
    assert.ok(!all.includes('_TZE200_hhhh0008'), 'payload driver without TS0601 gets no TS0601 group');
  });
  it('stays under maxTotal and maxDriver', () => {
    const { source, payload } = fixture();
    const start = T.totalCombos(payload); // 3 + 1 + 1 + 1 = 6
    const r = T.topUp(source, payload, { maxTotal: start + 2 });
    assert.ok(r.afterTotal <= start + 2);
    assert.strictEqual(r.addedGroups, 2, 'two 1-combo curtain groups fit, the 6-combo climate group does not');
    const p2 = fixture();
    const r2 = T.topUp(p2.source, p2.payload, { maxTotal: 1000, maxDriver: 2 });
    for (const d of p2.payload.drivers) assert.ok(C.comboCount(d) <= Math.max(2, C.comboCount(fixture().payload.drivers.find((x) => x.id === d.id))));
    assert.ok(r2.stillMissing >= 1);
  });
  it('observed (mfs_db) groups go first even when more expensive', () => {
    const { source, payload } = fixture();
    const r = T.topUp(source, payload, { maxTotal: T.totalCombos(payload) + 6, observed: new Set(['_tze200_cccc0003']) });
    const climate = payload.drivers.find((d) => d.id === 'climate').zigbee.manufacturerName;
    assert.ok(climate.some((m) => m.toLowerCase() === '_tze200_cccc0003'));
    assert.strictEqual(r.addedObserved, 1);
  });
  it('skips synthetic manufacturers and couples already present in any case form', () => {
    const source = { drivers: [drv('a', ['_TZE200_unknown', '_TZE200_PRESENT1', '_TZE200_new00001'], ['TS0601'])] };
    const payload = { drivers: [drv('a', ['_tze200_present1'], ['TS0601'])] };
    T.topUp(source, payload, { maxTotal: 100 });
    const names = payload.drivers[0].zigbee.manufacturerName;
    assert.ok(!names.includes('_TZE200_PRESENT1'));
    assert.ok(names.includes('_TZE200_new00001'));
    for (const n of names) assert.ok(!C.isSyntheticManufacturer(n));
  });
  it('disabled when the ceiling is 0 or unset; env ceiling is clamped to the measured maximum', () => {
    const { source, payload } = fixture();
    const before = clone(payload);
    const r = T.topUp(source, payload, { maxTotal: 0 });
    assert.strictEqual(r.enabled, false);
    assert.deepStrictEqual(payload, before);
    assert.strictEqual(T.ceilingFromEnv({}), 0);
    assert.strictEqual(T.ceilingFromEnv({ HOMEY_ZIGBEE_TOPUP_MAX_TOTAL: '19000' }), 19000);
    assert.strictEqual(T.ceilingFromEnv({ HOMEY_ZIGBEE_TOPUP_MAX_TOTAL: '50000' }), T.MEASURED_ACCEPTED_MAX_TOTAL);
    assert.strictEqual(T.ceilingFromEnv({ HOMEY_ZIGBEE_TOPUP_MAX_TOTAL: '50000', HOMEY_ZIGBEE_TOPUP_ALLOW_UNMEASURED: '1' }), 50000);
  });
  it('is wired: prepare-publish calls it, publish workflows set a ceiling <= the measured maximum, the budget gate follows it', () => {
    const pp = fs.readFileSync(path.join(ROOT, 'scripts/prepare-publish.js'), 'utf8');
    assert.match(pp, /topUpFile\(p3036TopupSource, destAppJson/);
    assert.ok(pp.indexOf('topUpFile(') > pp.indexOf('baselineUnresolved'), 'runs after the compaction checks');
    // Port branches (stable-v5 / bastien-home): the module and the prepare-publish hook are ported but DORMANT
    // (no HOMEY_ZIGBEE_TOPUP_MAX_TOTAL in publish-stable.yml / bastien-publish.yml) until master's 20k package is accepted.
    if (!fs.existsSync(path.join(ROOT, '.github/scripts/bisect-hold.js'))) {
      for (const wf of ['publish-stable.yml', 'bastien-publish.yml']) {
        const f = path.join(ROOT, '.github/workflows', wf);
        if (!fs.existsSync(f)) continue;
        const v = Number((fs.readFileSync(f, 'utf8').match(/HOMEY_ZIGBEE_TOPUP_MAX_TOTAL:\s*["']?(\d+)/) || [])[1] || 0);
        assert.ok(v <= T.MEASURED_ACCEPTED_MAX_TOTAL, `${wf}: ${v}`);
      }
      return;
    }
    for (const wf of ['auto-publish-on-push.yml', 'auto-fix-and-publish.yml']) {
      const y = fs.readFileSync(path.join(ROOT, '.github/workflows', wf), 'utf8');
      const v = Number((y.match(/HOMEY_ZIGBEE_TOPUP_MAX_TOTAL:\s*"(\d+)"/) || [])[1]);
      assert.ok(v > 0 && v <= T.MEASURED_ACCEPTED_MAX_TOTAL, `${wf}: ${v}`);
    }
    const lim = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/platform-limits.json'), 'utf8'));
    assert.deepStrictEqual(lim.limits.zigbee_combos.limitFrom.alsoEnv, ['HOMEY_ZIGBEE_TOPUP_MAX_TOTAL']);
  });
  it('real tree: compaction at the house caps + top-up loses no couple and keeps the driver set', function () {
    this.timeout(120000);
    const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    if (!Array.isArray(src.drivers) || !src.drivers.some((d) => d.zigbee)) return this.skip('source app.json has no drivers');
    const pay = clone(src);
    C.compactZigbeeIdentifiers(pay, { maxTotalCombos: 15500, maxDriverCombos: 1500, maxCaseForms: 2, repoRoot: ROOT });
    const before = T.presentCouples(pay);
    const ids = pay.drivers.map((d) => d.id).join(',');
    const r = T.topUp(src, pay, { maxTotal: 20000, maxDriver: 2000, maxCaseForms: 2 });
    const after = T.presentCouples(pay);
    for (const k of before) assert.ok(after.has(k), `lost ${k}`);
    assert.strictEqual(pay.drivers.map((d) => d.id).join(','), ids);
    assert.ok(r.afterTotal <= 20000);
    assert.ok(r.addedGroups > 0, 'the top-up brings back TS0601 groups on the current tree');
  });
});
