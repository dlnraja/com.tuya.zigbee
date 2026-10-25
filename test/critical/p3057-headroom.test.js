'use strict';
/**
 * P3057 — combo headroom without losing a real couple.
 * - presence_sensor_radar_ts0601 is a TS0601-only sibling of presence_sensor_radar (same runtime);
 * - radar flow cards are app-level with the family filter (ids unchanged);
 * - DriverFamily keeps migration / wrong-driver checks quiet between the two ids;
 * - owner-approved removal exemptions (removed:true) are never force-pinned again;
 * - t561u phantom exemptions are well-formed and decided only under the parasite-removal rule.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const lc = (s) => String(s).toLowerCase();
const PARENT = 'presence_sensor_radar';
const SIB = 'presence_sensor_radar_ts0601';
const NON_NATIVE = (c) => (c >= 0xE000 && c <= 0xE002) || c === 0xEF00 || c === 0xEF01 || (c >= 0xFC00 && c <= 0xFFFF);

describe('P3057 headroom: radar TS0601 sibling', () => {
  const parent = read(`drivers/${PARENT}/driver.compose.json`);
  const sib = read(`drivers/${SIB}/driver.compose.json`);

  it('sibling is TS0601-only, Tuya _TZE names only, and runs the parent code', () => {
    assert.deepStrictEqual(sib.zigbee.productId, ['TS0601']);
    assert.ok(sib.zigbee.manufacturerName.length > 0);
    for (const m of sib.zigbee.manufacturerName) assert.ok(/^_tze/i.test(m), `non _TZE name on sibling: ${m}`);
    for (const f of ['device.js', 'driver.js']) {
      const src = fs.readFileSync(path.join(ROOT, 'drivers', SIB, f), 'utf8');
      assert.ok(src.includes(`require('../${PARENT}/${f.replace('.js', '')}')`), `${f} must reuse the parent`);
    }
  });

  it('sibling exposes the same capabilities, options, class and settings as the parent', () => {
    assert.strictEqual(sib.class, parent.class);
    assert.deepStrictEqual(sib.capabilities, parent.capabilities);
    assert.deepStrictEqual(sib.capabilitiesOptions, parent.capabilitiesOptions);
    assert.deepStrictEqual(read(`drivers/${SIB}/driver.settings.compose.json`), read(`drivers/${PARENT}/driver.settings.compose.json`));
  });

  it('nothing mandatory at pairing: no non-native cluster on the sibling manifest', () => {
    for (const [ep, def] of Object.entries(sib.zigbee.endpoints || {})) {
      for (const c of def.clusters || []) assert.ok(!NON_NATIVE(Number(c)), `ep${ep} lists non-native 0x${Number(c).toString(16)}`);
    }
  });

  it('one couple, one driver: no case-insensitive overlap with the parent or any other driver', () => {
    const sibSet = new Set(sib.zigbee.manufacturerName.map(lc));
    for (const m of parent.zigbee.manufacturerName) assert.ok(!sibSet.has(lc(m)), `parent+sibling both list ${m}`);
    for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      if (d === SIB || d === PARENT) continue;
      const f = path.join(ROOT, 'drivers', d, 'driver.compose.json');
      if (!fs.existsSync(f)) continue;
      let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
      const pids = ((j.zigbee && j.zigbee.productId) || []).map(lc);
      if (!pids.includes('ts0601')) continue;
      for (const m of (j.zigbee && j.zigbee.manufacturerName) || []) {
        assert.ok(!sibSet.has(lc(m)), `${m}|TS0601 also on ${d}`);
      }
    }
  });

  it('migration-safe: the parent keeps its id and every non-TS0601 product id', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'drivers', PARENT, 'device.js')));
    assert.ok(parent.zigbee.productId.length > 1, 'parent keeps its non-TS0601 pids');
    const app = read('app.json');
    assert.ok(app.drivers.find((d) => d.id === PARENT));
    assert.ok(app.drivers.find((d) => d.id === SIB));
  });

  it('radar flow cards are app-level with the family filter and unchanged ids', () => {
    const flow = read(`drivers/${PARENT}/driver.flow.compose.json`);
    for (const k of ['triggers', 'conditions', 'actions']) assert.ok(!(flow[k] || []).length, `parent driver ${k} moved app-level`);
    const ids = [];
    for (const k of ['triggers', 'conditions', 'actions']) {
      const dir = path.join(ROOT, '.homeycompose', 'flow', k);
      for (const f of fs.readdirSync(dir).filter((x) => x.startsWith(`${PARENT}_`))) {
        const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        assert.strictEqual(`${c.id}.json`, f);
        const dev = (c.args || []).find((a) => a.type === 'device');
        assert.ok(dev, `${c.id} needs a device arg`);
        assert.strictEqual(dev.filter, `driver_id=${PARENT}|${SIB}`, `${c.id} filter`);
        ids.push(c.id);
      }
    }
    assert.strictEqual(ids.length, 19);
    for (const id of ['presence_sensor_radar_presence_detected', 'presence_sensor_radar_clear_presence',
      'presence_sensor_radar_movement_classificatio_ee75a', 'presence_sensor_radar_is_present']) {
      assert.ok(ids.includes(id), `card id kept: ${id}`);
    }
    // Every id the radar code uses literally still resolves to an app-level card.
    const src = ['device.js', 'driver.js'].map((f) => fs.readFileSync(path.join(ROOT, 'drivers', PARENT, f), 'utf8')).join('\n');
    for (const m of src.matchAll(/'(presence_sensor_radar_[a-z0-9_]+)'/g)) {
      if (fs.existsSync(path.join(ROOT, 'drivers', m[1]))) continue;
      assert.ok(ids.includes(m[1]) || !/_(detected|cleared|changed|presence|active|within|above|is|clear_presence)$/.test(m[1]), `literal card ${m[1]} has no app-level card`);
    }
  });
});

describe('P3057 headroom: DriverFamily', () => {
  const F = require('../../lib/utils/DriverFamily');
  it('maps the sibling to its parent and treats both as one driver', () => {
    assert.strictEqual(F.canonicalDriverId(SIB), PARENT);
    assert.strictEqual(F.canonicalDriverId(PARENT), PARENT);
    assert.strictEqual(F.canonicalDriverId('motion_sensor'), 'motion_sensor');
    assert.ok(F.sameDriverFamily(SIB, PARENT));
    assert.ok(F.sameDriverFamily(PARENT, SIB));
    assert.ok(!F.sameDriverFamily(SIB, 'motion_sensor'));
    assert.ok(!F.sameDriverFamily(undefined, PARENT));
    assert.ok(Object.isFrozen(F.SIBLING_TO_PARENT));
  });
  it('every sibling exists and reuses its parent code', () => {
    for (const [s, p] of Object.entries(F.SIBLING_TO_PARENT)) {
      assert.ok(fs.existsSync(path.join(ROOT, 'drivers', s, 'driver.compose.json')), s);
      assert.ok(fs.existsSync(path.join(ROOT, 'drivers', p, 'driver.compose.json')), p);
    }
  });
  it('wrong-driver checks use the family, not raw id inequality', () => {
    const h = fs.readFileSync(path.join(ROOT, 'lib/helpers/device_helpers.js'), 'utf8');
    const b = fs.readFileSync(path.join(ROOT, 'lib/devices/BaseUnifiedDevice.js'), 'utf8');
    assert.ok(h.includes('sameDriverFamily'), 'device_helpers');
    assert.ok(b.includes('sameDriverFamily'), 'BaseUnifiedDevice');
  });
});

describe('P3057 headroom: removal exemptions are never re-pinned', () => {
  const { resolveBaselinePins } = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');
  const manifest = {
    drivers: [
      { id: 'a', zigbee: { manufacturerName: ['_TZ3000_x'], productId: ['TS0001'] } },
      { id: 'b', zigbee: { manufacturerName: ['_TZ3000_x', '_TZ3000_y'], productId: ['TS0002', 'TS0003'] } },
    ],
  };
  const base = (removed) => ({
    version: 't', drivers: { gone: { m: ['_TZ3000_x'], p: ['TS0002'] } },
    exemptions: [{ mfr: '_TZ3000_x', pid: 'TS0002', driverId: 'gone', reason: 'test', approvedBy: 'test', date: '2026-10-26', ...(removed ? { removed: true } : {}) }],
  });
  it('removed:true drops the couple (no forced pin row)', function () {
    if (typeof resolveBaselinePins !== 'function') this.skip();
    const r = resolveBaselinePins(JSON.parse(JSON.stringify(manifest)), base(true));
    assert.strictEqual(r.dropped, 1);
    assert.strictEqual(r.pins.length, 0);
  });
  it('a plain (move) exemption keeps the old behaviour: the couple is pinned on its current owner', () => {
    const r = resolveBaselinePins(JSON.parse(JSON.stringify(manifest)), base(false));
    assert.strictEqual(r.dropped, 0);
    assert.strictEqual(r.moved, 1);
    assert.ok(r.pins.some((p) => p.driverId === 'b' && p.mfr === '_TZ3000_x' && p.pid === 'TS0002'));
  });
  it('the compactor source keeps the removedExempt skip', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/maintenance/compact-zigbee-identifiers.cjs'), 'utf8');
    assert.ok(/e\.removed === true/.test(src));
    assert.ok(src.includes('baselineDropped'));
  });
});

describe('P3057 headroom: t561u phantom exemptions', () => {
  const f = read('test/fixtures/athom-last-test-package-couples.json');
  const ex = f.exemptions.filter((e) => e.approvedBy === 't561u');
  it('are 42 well-formed removals with a P3057 reason and a past date', () => {
    assert.strictEqual(ex.length, 42);
    for (const e of ex) {
      assert.ok(e.mfr && e.pid && e.driverId, JSON.stringify(e));
      assert.strictEqual(e.removed, true);
      assert.ok(/^P3057/.test(e.reason) && /t561u/.test(e.reason), `${e.mfr}|${e.pid} reason`);
      assert.ok(/^2026-10-2[56]T\d\d:\d\d\+01:00$/.test(e.date), `${e.mfr}|${e.pid} date ${e.date}`);
      assert.ok(Date.parse(e.date) <= Date.parse('2026-10-26T01:30+01:00'), 'decided this night, not in the future');
    }
  });
  it('never exempt a real Tuya DP couple _TZE2xx_|TS0601 (real devices stay pinned)', () => {
    // _tze3000_pfc7i3kt is a mangled-prefix phantom (no _TZE3000_ Tuya family exists), not a DP device.
    for (const e of ex) assert.ok(!(/^_tze2\d\d_/i.test(e.mfr) && lc(e.pid) === 'ts0601'), `${e.mfr}|${e.pid}`);
  });
});
