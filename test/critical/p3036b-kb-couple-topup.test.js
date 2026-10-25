'use strict';
// P3036b: KB couple top-up after the publish compaction (scripts/maintenance/kb-couple-topup.cjs).
// Base cap 17000 + KB top-up up to 20000 total / 1008 per driver = the measured accepted Athom maxima
// (docs/knowledge/ATHOM_LIMITS.md). Tier 1 puts back the KB couples the P3038c pins pushed out
// (config/architecture/kb-topup-priority.json), tier 2 adds other KB couples. Adds only, same driver set.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const K = require(path.join(ROOT, 'scripts/maintenance/kb-couple-topup.cjs'));
const clone = (o) => JSON.parse(JSON.stringify(o));
const drv = (id, m, p) => ({ id, zigbee: { manufacturerName: m, productId: p } });
const wfEnv = (file, key) => {
  const y = fs.readFileSync(path.join(ROOT, '.github/workflows', file), 'utf8');
  const m = new RegExp(`${key}:\\s*["']?(\\d+)`).exec(y);
  return m ? Number(m[1]) : null;
};

describe('P3036b KB couple top-up', () => {
  const source = { drivers: [drv('a', ['_A', '_B', '_C'], ['TS0601', 'TS011F']), drv('b', ['_A', '_D'], ['TS0601'])] };
  const payloadOf = () => ({ drivers: [drv('a', ['_A'], ['TS0601']), drv('b', ['_A'], ['TS0601'])] });
  const kb = new Set(['_B|TS0601', '_D|TS0601', '_C|TS011F', '_Z|TS0601']);

  it('tier 2 adds one manufacturer form where the productId is already shipped, never a pid or a driver', () => {
    const pay = payloadOf();
    const r = K.topUp(source, pay, { maxTotal: 100, kb, priority: new Set() });
    const ids = pay.drivers.map((d) => d.id).join(',');
    assert.strictEqual(ids, 'a,b');
    const got = K.exactCouples(pay);
    assert.ok(got.has('_B|TS0601') && got.has('_D|TS0601'));
    assert.ok(!got.has('_C|TS011F'), 'TS011F is not in the payload driver: tier 2 does not add a productId');
    assert.ok(r.unplaceable.some((u) => u.couple === '_C|TS011F'));
    assert.ok(!got.has('_Z|TS0601'), 'a KB couple no source driver declares is never added');
  });

  it('tier 1 (priority) also restores a trimmed productId on a declaring driver', () => {
    const pay = payloadOf();
    const r = K.topUp(source, pay, { maxTotal: 100, kb, priority: new Set(['_C|TS011F']) });
    assert.ok(K.exactCouples(pay).has('_C|TS011F'));
    assert.strictEqual(r.priority.restored.length, 1);
    assert.ok(r.afterTotal <= 100);
  });

  it('respects the total ceiling and clamps to the measured maxima', () => {
    const pay = payloadOf();
    const r = K.topUp(source, pay, { maxTotal: 2, kb, priority: new Set() });
    assert.strictEqual(r.afterTotal, 2, 'nothing fits above the ceiling');
    assert.strictEqual(K.topUp(source, payloadOf(), { maxTotal: 999999, kb }).maxTotal, 20000);
    assert.strictEqual(K.topUp(source, payloadOf(), { maxTotal: 1, maxDriver: 5000, kb }).maxDriver, K.MEASURED_ACCEPTED_MAX_DRIVER);
    assert.strictEqual(K.ceilingFromEnv({ HOMEY_ZIGBEE_KB_TOPUP_MAX_TOTAL: '25000' }), 20000);
    assert.strictEqual(K.ceilingFromEnv({}), 0);
  });

  it('effective publish workflows: base 17000, KB top-up ≤ 20000', () => {
    for (const f of ['auto-publish-on-push.yml', 'publish-stable.yml', 'bastien-publish.yml']) {
      assert.strictEqual(wfEnv(f, 'HOMEY_ZIGBEE_MAX_TOTAL_COMBOS'), 17000, f);
      const kbMax = wfEnv(f, 'HOMEY_ZIGBEE_KB_TOPUP_MAX_TOTAL');
      assert.ok(kbMax > 17000 && kbMax <= 20000, `${f} KB ceiling ${kbMax}`);
    }
    const lim = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/platform-limits.json'), 'utf8'));
    assert.ok(lim.limits.zigbee_combos.limitFrom.alsoEnv.includes('HOMEY_ZIGBEE_KB_TOPUP_MAX_TOTAL'));
  });

  it('prepare-publish runs the KB top-up before the TS0601 top-up, with FATAL guards', () => {
    const s = fs.readFileSync(path.join(ROOT, 'scripts/prepare-publish.js'), 'utf8');
    const kbAt = s.indexOf("require('./maintenance/kb-couple-topup.cjs')");
    const tsAt = s.indexOf("require('./maintenance/ts0601-topup.cjs')");
    assert.ok(kbAt > 0 && tsAt > kbAt);
    assert.match(s, /FATAL\(P3036b\): KB top-up changed the driver set/);
    assert.match(s, /FATAL\(P3036b\): .*priority KB couple/);
  });

  it('real tree: workflow caps + KB top-up put back every priority couple, ≤ 20000, same drivers, nothing lost', function () {
    const C = require(path.join(ROOT, 'scripts/maintenance/compact-zigbee-identifiers.cjs'));
    const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    if (!Array.isArray(src.drivers) || !src.drivers.some((d) => d.zigbee)) return;
    const pay = clone(src);
    const c = C.compactZigbeeIdentifiers(pay, { maxTotalCombos: wfEnv('auto-publish-on-push.yml', 'HOMEY_ZIGBEE_MAX_TOTAL_COMBOS'), maxDriverCombos: 1500, maxCaseForms: 2, repoRoot: ROOT });
    assert.ok(!c.overTotalLimit);
    assert.deepStrictEqual(c.sacredMissing || [], []);
    const before = K.exactCouples(pay);
    const ids = pay.drivers.map((d) => d.id).join(',');
    const r = K.topUp(src, pay, { maxTotal: wfEnv('auto-publish-on-push.yml', 'HOMEY_ZIGBEE_KB_TOPUP_MAX_TOTAL'), root: ROOT });
    const after = K.exactCouples(pay);
    for (const k of before) assert.ok(after.has(k), `lost ${k}`);
    assert.strictEqual(pay.drivers.map((d) => d.id).join(','), ids);
    assert.ok(r.afterTotal <= 20000);
    assert.strictEqual(r.priority.restored.length + r.priority.already, r.priority.listed, `priority not restored: ${r.stillMissing.slice(0, 5)}`);
    for (const d of pay.drivers) if (d.zigbee) assert.ok([].concat(d.zigbee.manufacturerName || []).length * [].concat(d.zigbee.productId || []).length <= Math.max(1500, K.MEASURED_ACCEPTED_MAX_DRIVER), d.id);
  });
});
