'use strict';
// P3039d: one couple, one driver. Wrong-class hosts give their exact couple to the driver of the
// device's real class (source: zigbee-herdsman-converters tuya.ts). Moves only: every couple stays
// recognised, P3024b baseline keeps 0 missing (simulated on the compacted publish manifest).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { decode } = require('../../lib/tuya/TuyaDpProfileCodec');

const ROOT = path.resolve(__dirname, '../..');
const compose = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
const has = (c, mfr) => c.zigbee.manufacturerName.some((m) => m.toLowerCase() === mfr.toLowerCase());

describe('P3039d class moves', () => {
  it('ME168 AVATTO TRV _TZE200_cxakecfo lives on device_radiator_valve, not on sensor_climate_contact', () => {
    const trv = compose('device_radiator_valve');
    assert.ok(trv.zigbee.manufacturerName.includes('_TZE200_cxakecfo'));
    assert.ok(trv.zigbee.productId.includes('TS0601'));
    assert.ok(!has(compose('sensor_climate_contact'), '_TZE200_cxakecfo'));
  });
  it('DCR-CO _TZE200/_TZE204_7bztmfm1 + TS0601 lives on co_sensor_dcr_co', () => {
    const co = compose('co_sensor_dcr_co');
    for (const m of ['_TZE200_7bztmfm1', '_TZE204_7bztmfm1']) {assert.ok(co.zigbee.manufacturerName.includes(m), m);}
    assert.deepStrictEqual(co.zigbee.productId, ['TS0601']);
    assert.ok(/zigbee-herdsman-converters/.test(co.metadata.source));
    for (const ep of Object.values(co.zigbee.endpoints || {})) {
      assert.ok(!(ep.clusters || []).includes(61184));
      assert.ok(!(ep.bindings || []).includes(61184));
    }
  });
  it('device_air_purifier_plug no longer claims TS0601 (P3055: nor _TZE200_7bztmfm1, no source attests any of its couples there)', () => {
    const p = compose('device_air_purifier_plug');
    // P3039d kept the mfr for its other couples; P3055 (owner yes t555u) checked each of them
    // as an exact couple and none is attested, so the DCR-CO mfr left the plug driver.
    assert.ok(!has(p, '_TZE200_7bztmfm1'));
    assert.ok(!p.zigbee.productId.includes('TS0601'));
  });
  it('DCR-CO DP1 raw 0 means CO detected, DP2 is ppm/100', () => {
    assert.strictEqual(decode({ kind: 'inSet', set: [0] }, 0), true);
    assert.strictEqual(decode({ kind: 'inSet', set: [0] }, 1), false);
    assert.strictEqual(decode({ kind: 'value', divisor: 100 }, 1250), 12.5);
  });

  // --- P3039d lot B (owner yes t522s3008, 25/10 17:29 Paris) + t524u (truth key = exact mfr+pid) ---
  const SMOKE4 = ['_TZE200_t5p1vj8r', '_TZE200_uebojraa', '_TZE200_vzekyi4c', '_TZE200_dq1mfjug'];
  it('TS0601_smoke_4 x4 (_TZE200_ forms only) + TS0601_smoke_1 _TZE204_ntcy3xu1 live on smoke_sensor_ts0601_dp', () => {
    const s = compose('smoke_sensor_ts0601_dp');
    assert.deepStrictEqual(s.zigbee.productId, ['TS0601']);
    assert.ok(s.capabilities.includes('alarm_tamper'));
    for (const m of [...SMOKE4, '_TZE204_ntcy3xu1']) {assert.ok(has(s, m), m);}
    const sw = compose('switch_wireless');
    for (const m of SMOKE4) {assert.ok(!has(sw, m), `switch_wireless still has ${m}`);}
    // couple, not mfr: the _TZE204/_TZE284_t5p1vj8r forms are not in Z2M smoke_4 and stay put
    assert.ok(has(sw, '_TZE204_t5p1vj8r') && has(sw, '_TZE284_t5p1vj8r'));
    assert.ok(!has(compose('socket_power_strip_four_three'), '_TZE204_ntcy3xu1'));
  });
  it('_TZ3000_mwd3c2at (TS0202 PIR) on slim_motion_sensor; PIRIV01|Excellux on motion_sensor_excellux_zg104plv', () => {
    const slim = compose('slim_motion_sensor');
    assert.ok(has(slim, '_TZ3000_mwd3c2at') && slim.zigbee.productId.includes('TS0202'));
    assert.ok(!has(compose('smart_irrigation_valve'), '_TZ3000_mwd3c2at'));
    const ex = compose('motion_sensor_excellux_zg104plv');
    assert.deepStrictEqual(ex.zigbee.productId, ['Excellux']);
    assert.ok(has(ex, 'PIRIV01'));
    assert.ok(!has(compose('motion_sensor_switch'), 'PIRIV01'));
    for (const id of ['motion_sensor_excellux_zg104plv', 'smoke_sensor_ts0601_dp']) {
      for (const ep of Object.values(compose(id).zigbee.endpoints || {})) {
        assert.ok(!(ep.clusters || []).includes(61184), id);
        assert.ok(!(ep.bindings || []).includes(61184), id);
      }
    }
  });
  it('P3024b exemptions = exactly the 34 parasitic combos approved in t522s3008, with reason', () => {
    const f = JSON.parse(fs.readFileSync(path.join(ROOT, 'test/fixtures/athom-last-test-package-couples.json'), 'utf8'));
    // WHY(P3067): later owner-approved removals (approvedBy + reason + date, e.g. EcoDim 09hzmirw smoke parasites)
    // are additive to the baseline; this test keeps pinning exactly the 34 t522s3008 entries.
    const later = f.exemptions.filter((e) => e.approvedBy !== 't522s3008');
    for (const e of later) {assert.ok(e.mfr && e.pid && e.reason && e.approvedBy && e.date, `later exemption ${e.mfr}|${e.pid} needs reason/approvedBy/date`);}
    const ex = f.exemptions.filter((e) => e.approvedBy === 't522s3008');
    assert.strictEqual(ex.length, 34);
    const want = {
      switch_wireless: [/^_tze200_(t5p1vj8r|uebojraa|vzekyi4c|dq1mfjug)$/i, ['TS0601_wirelesssw', 'TS0215A'], 16],
      socket_power_strip_four_three: [/^_tze204_ntcy3xu1$/i, ['JZ-ZB-004', 'TS011F', 'TS0115'], 6],
      smart_irrigation_valve: [/^_tz3000_mwd3c2at$/i, ['TS0601', 'TS0049'], 4],
      motion_sensor_switch: [/^piriv01$/i, ['TS0001', 'TS0202', 'TS0225', 'TS0601'], 8],
    };
    const count = {};
    for (const e of ex) {
      const w = want[e.driverId];
      assert.ok(w, `unexpected exemption driver ${e.driverId}`);
      assert.ok(w[0].test(e.mfr) && w[1].includes(e.pid), `${e.mfr}|${e.pid}@${e.driverId}`);
      assert.ok(/t522s3008/.test(e.reason) && e.approvedBy === 't522s3008', 'cites the owner yes');
      count[e.driverId] = (count[e.driverId] || 0) + 1;
    }
    for (const [id, w] of Object.entries(want)) {assert.strictEqual(count[id], w[2], id);}
  });
  it('CoupleGuard: exact couple, case-insensitive; unlisted pid of a constrained mfr -> soft warning, never throws', () => {
    const G = require('../../lib/utils/CoupleGuard');
    assert.strictEqual(G.checkCouple('slim_motion_sensor', '_TZ3000_MWD3C2AT', 'ts0202').ok, true);
    assert.strictEqual(G.checkCouple('slim_motion_sensor', '_tz3000_mwd3c2at', 'LH02121').ok, false);
    assert.strictEqual(G.checkCouple('slim_motion_sensor', '_TZ3000_other', 'LH02121').constrained, false);
    assert.strictEqual(G.checkCouple('motion_sensor_excellux_zg104plv', 'PIRIV01', 'Excellux').ok, true);
    const warn = [];
    const dev = {
      driver: { id: 'slim_motion_sensor' },
      getSetting: (k) => ({ zb_manufacturer_name: '_TZ3000_mwd3c2at', zb_product_id: 'LH02121' }[k]),
      setWarning: (m) => { warn.push(m); return Promise.resolve(); },
      log: () => {},
    };
    assert.strictEqual(G.guard(dev).ok, false);
    assert.strictEqual(warn.length, 1);
    assert.strictEqual(G.guard(dev).ok, true, 'idempotent');
    assert.doesNotThrow(() => G.guard({ driver: { id: 'x' }, getSetting: () => { throw new Error('boom'); } }));
  });
  it('CI audit: no NEW parasitic mfr x pid combo on multi-driver mfrs (baseline ones do not block)', () => {
    const { audit } = require('../../scripts/ci/mfr-multi-driver-audit.js');
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const base = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, '.github/mfr-multi-driver-parasitic-baseline.json'), 'utf8')).parasitic);
    const fresh = audit(app).parasitic.filter((k) => !base.has(k));
    assert.deepStrictEqual(fresh, []);
  });
});

