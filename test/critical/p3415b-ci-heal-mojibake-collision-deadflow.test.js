'use strict';
// P3415b (CI heal of 776c238a45..176b95709b, bastien-home 2026-11-28): 776c238a45 saved ci-self-check.yml through a cp1252 round-trip
// (em dash -> "\u00e2\u20ac\u201d"), which staled the P3069 about header; p3406 did the same to one log line of
// FeatureFlowCards.js ("\u00d7" -> "\u00c3\u2014", a char > U+00FF in shipped JS, P3320). p3402 registered the
// climate_sensor condition cards explicitly, which left 5 stale entries in the P2803 dead-flow map.
// _TZ3290_8xzb2ghn is the KCTW1Z IR blaster (Z2M/ZHC: TS1201) -> ir_blaster since p3404; the TS0002/TS0601
// overlap with button_wireless_2 (couples present since P92.47, never dropped) is baselined like master.
// e960475bd7 (PR #634 backport) moved _TZE204/_TZE284_ltwbm23f (TRV602Z) to device_radiator_valve: the spec010
// golden snapshot records that move for climate_sensor, and the couples must stay owned by the valve driver.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');

const ROOT = path.resolve(__dirname, '../..');
const MOJIBAKE = /\u00c3[\u0080-\u00bf\u2014\u2018-\u201e\u2020-\u2022\u2026\u2030\u0152\u0153\u0160\u0161\u0178\u017d\u017e]|\u00e2\u20ac/;
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const mfrs = (drv) => JSON.parse(read(`drivers/${drv}/driver.compose.json`)).zigbee.manufacturerName.map((m) => m.toLowerCase());

describe('P3415b CI heal: mojibake, KCTW1Z collision baseline, stale dead-flow map', () => {
  it('no workflow file carries cp1252 mojibake', () => {
    const dir = path.join(ROOT, '.github/workflows');
    const bad = fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f) && MOJIBAKE.test(fs.readFileSync(path.join(dir, f), 'utf8')));
    assert.deepStrictEqual(bad, []);
  });

  it('FeatureFlowCards.js has no mojibake and stays Latin-1', () => {
    const src = read('lib/flow/FeatureFlowCards.js');
    assert.ok(!MOJIBAKE.test(src));
    assert.ok(!/[^\u0000-\u00ff]/.test(src));
  });

  it('_TZ3290_8xzb2ghn keeps TS1201 in ir_blaster and no couple is lost from button_wireless_2', () => {
    const ir = JSON.parse(read('drivers/ir_blaster/driver.compose.json')).zigbee;
    assert.ok(ir.manufacturerName.includes('_TZ3290_8xzb2ghn'));
    assert.ok(ir.productId.includes('TS1201'));
    assert.ok(mfrs('button_wireless_2').includes('_tz3290_8xzb2ghn'));
    const base = JSON.parse(read('.github/fingerprint-collision-baseline.json')).collisions;
    for (const pid of ['TS0002', 'TS0601']) {
      const e = base.find((c) => c.key === `_tz3290_8xzb2ghn|${pid}`);
      assert.ok(e, pid);
      assert.deepStrictEqual(e.drivers, ['button_wireless_2', 'ir_blaster']);
    }
  });

  it('dead-flow map never auto-wires a card the driver registers itself', () => {
    const map = JSON.parse(read('config/flow/dead-flow-autowire.json'));
    const drvSrc = read('drivers/climate_sensor/driver.js');
    for (const id of Object.keys(map.conditions).filter((k) => k.startsWith('climate_sensor_'))) {
      assert.ok(!drvSrc.includes(`'${id}'`), id);
    }
  });

  it('TRV602Z couples moved by PR #634 stay on device_radiator_valve (move, not loss)', () => {
    const valve = mfrs('device_radiator_valve');
    for (const m of ['_tze204_ltwbm23f', '_tze284_ltwbm23f']) {
      assert.ok(valve.includes(m), m);
      assert.ok(!mfrs('climate_sensor').includes(m), m);
    }
  });
});
