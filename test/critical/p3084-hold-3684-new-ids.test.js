'use strict';
const { describe, it } = require('../_support/dual-runner');
/**
 * P3084 (27/10/2026): master #3684 v9.0.1602 failed AggregateError after a clean upload. Its payload had
 * 361 drivers vs 347 in Test #3682 v9.0.1599 (14 new never-published pairable ids, the documented
 * AggregateError trigger). Nine of them carry only new couples and are held back; the other new ids
 * carry couples moved off published drivers, so holding them would drop Test couples (P3024b gate).
 * Guards: the nine are held, never published, own no couple of another 9.0.1574 driver, and
 * release_held still frees one id only.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { effectiveHoldIds } = require('../../scripts/publish-hold-release');

const ROOT = path.join(__dirname, '..', '..');
const hold = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'publish-hold-drivers.json'), 'utf8'));
const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'athom-test-9.0.1574-driver-ids.json'), 'utf8'));
const published = new Set(base.ids);
const P3084 = ['energy_meter_3ch_bidirectional', 'gpo_double_light_mg_au03', 'gpo_double_mg_gpo02z',
  'keypad_alarm_wke502z', 'thermostat_vrf_bvrf_l001', 'ufh_controller_ch8z', 'ufh_controller_pro_line_x10',
  'wall_switch_rf_ews1154z', 'curtain_sonoff_mini_zbrbs'];
// New ids whose couples were moved off published drivers: holding them would break Test couples.
const MOVED_COUPLES = ['air_conditioner_aetz01', 'co_sensor_dcr_co', 'fan_light_tuya_5_levels',
  'motion_sensor_excellux_zg104plv', 'smoke_sensor_ts0601_dp', 'vibration_sensor_excellux_zg103v'];

function couplesOf(id) {
  const file = path.join(ROOT, 'drivers', id, 'driver.compose.json');
  const z = JSON.parse(fs.readFileSync(file, 'utf8')).zigbee || {};
  const out = [];
  for (const m of z.manufacturerName || []) for (const p of z.productId || []) out.push(`${m}\u0000${p}`);
  return out;
}

describe('P3084 publish hold after #3684 AggregateError', () => {
  it('the nine pure-new ids are held with a P3084 reason', () => {
    const { ids } = effectiveHoldIds(hold, '');
    for (const id of P3084) {
      if (!fs.existsSync(path.join(ROOT, 'drivers', id))) continue;
      assert.ok(ids.has(id), `${id} not held`);
      const e = hold.drivers.find((d) => d.id === id);
      assert.ok(/P3084/.test(e.reason) && /#3684/.test(e.reason), id);
    }
  });
  it('none of them was ever published (absent from Test 1574)', () => {
    assert.deepStrictEqual(P3084.filter((id) => published.has(id)), []);
  });
  it('none of them owns a couple of the Test 1574 package (exact mfr+pid)', () => {
    const { loadPublishBaseline, baselineCouples } = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');
    const test = new Set(baselineCouples(loadPublishBaseline(ROOT)).map((c) => `${c.mfr}\u0000${c.pid}`));
    assert.ok(test.size > 10000);
    for (const id of P3084) {
      if (!fs.existsSync(path.join(ROOT, 'drivers', id))) continue;
      assert.deepStrictEqual(couplesOf(id).filter((c) => test.has(c)), [], id);
    }
  });
  it('ids carrying moved Test couples are not held', () => {
    const { ids } = effectiveHoldIds(hold, '');
    assert.deepStrictEqual(MOVED_COUPLES.filter((id) => ids.has(id)), []);
  });
  it('release_held frees one P3084 id only', () => {
    const r = effectiveHoldIds(hold, 'keypad_alarm_wke502z');
    assert.deepStrictEqual(r.released, ['keypad_alarm_wke502z']);
    assert.ok(!r.ids.has('keypad_alarm_wke502z') && r.ids.has('ufh_controller_ch8z'));
  });
});
