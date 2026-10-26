'use strict';
// P3068 (t568u): one couple, one driver for 4 wrong-class couples (sources: zigbee-herdsman-converters tuya.ts /
// mercator.ts, Ikuu SISWD11-ZB spec sheet), plus the 0hcjew5p pilot-wire thermostats wrongly armed as FCU
// before P3067 (capabilities kept, no longer driven).
require('../_support/homey-stub').install();
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { decode, encode } = require('../../lib/tuya/TuyaDpProfileCodec');

const ROOT = path.resolve(__dirname, '../..');
const compose = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
const has = (c, mfr) => c.zigbee.manufacturerName.some((m) => m.toLowerCase() === mfr.toLowerCase());
const noEf00 = (id) => {
  for (const ep of Object.values(compose(id).zigbee.endpoints || {})) {
    assert.ok(!(ep.clusters || []).includes(61184), id);
    assert.ok(!(ep.bindings || []).includes(61184), id);
  }
};
const profile = (id, mfr) => {
  const Dev = require(path.join(ROOT, 'drivers', id, 'device.js'));
  return Dev.prototype.profileFor.call({}, mfr);
};

describe('P3068 class moves', () => {
  it('jowqowye (Mercator SISWD11-ZB inline dimmer) lives on wall_dimmer_tuya, not on ceiling_fan', () => {
    const dim = compose('wall_dimmer_tuya');
    assert.ok(dim.zigbee.manufacturerName.includes('_TZE200_jowqowye') && dim.zigbee.manufacturerName.includes('_tze200_jowqowye'));
    assert.ok(dim.zigbee.productId.includes('TS0601'));
    assert.strictEqual(dim.class, 'light');
    assert.ok(!has(compose('ceiling_fan'), '_TZE200_jowqowye'));
  });

  it('ikul00sx fan + light: own driver, 5 raw levels both ways, not on humidifier', () => {
    const c = compose('fan_light_tuya_5_levels');
    assert.strictEqual(c.class, 'fan');
    assert.deepStrictEqual(c.zigbee.productId, ['TS0601']);
    assert.deepStrictEqual(c.zigbee.manufacturerName, ['_TZE284_ikul00sx', '_tze284_ikul00sx']);
    assert.ok(!has(compose('humidifier'), '_TZE284_ikul00sx'));
    noEf00('fan_light_tuya_5_levels');
    const p = profile('fan_light_tuya_5_levels', '_tze284_ikul00sx');
    assert.deepStrictEqual(p.capabilities, c.capabilities);
    assert.strictEqual(p.dps[1].cap, 'onoff'); assert.strictEqual(p.dps[104].cap, 'onoff.light');
    const lv = p.dps[6];
    assert.deepStrictEqual([300, 410, 520, 650, 1000].map((r) => decode(lv, r)), [0.2, 0.4, 0.6, 0.8, 1]);
    assert.deepStrictEqual([0, 0.2, 0.5, 0.79, 1].map((v) => encode(lv, v).value), [300, 300, 520, 650, 1000]);
    assert.strictEqual(encode(p.dps[105], 0.4).value, 410);
  });

  it('VABRATE|Excellux (ZG-103V vibration) lives on a sensor driver, not on socket-class motion_sensor_switch', () => {
    const c = compose('vibration_sensor_excellux_zg103v');
    assert.strictEqual(c.class, 'sensor');
    assert.deepStrictEqual(c.zigbee.productId, ['Excellux']);
    assert.ok(c.zigbee.manufacturerName.includes('VABRATE') && c.zigbee.manufacturerName.includes('vabrate'));
    assert.ok(!has(compose('motion_sensor_switch'), 'VABRATE'));
    noEf00('vibration_sensor_excellux_zg103v');
    const p = profile('vibration_sensor_excellux_zg103v', 'vabrate');
    assert.strictEqual(p.dps[3].cap, 'alarm_vibration'); assert.strictEqual(p.dps[4].cap, 'measure_battery');
    assert.ok(c.settings.some((s) => s.id === 'zg103v_sensitivity' && s.max === 50));
  });

  it('_TZE200_snfdqllf (AETZ01_AC) lives on air_conditioner_aetz01 with the source enums', () => {
    const c = compose('air_conditioner_aetz01');
    assert.strictEqual(c.class, 'thermostat');
    assert.ok(!has(compose('device_radiator_valve'), '_TZE200_snfdqllf'));
    noEf00('air_conditioner_aetz01');
    const p = profile('air_conditioner_aetz01', '_tze200_snfdqllf');
    assert.deepStrictEqual(p.capabilities, c.capabilities);
    assert.strictEqual(decode(p.dps[4], 2), 'fan_only');
    assert.deepStrictEqual(encode(p.dps[4], 'dry'), { value: 1, type: 'enum' });
    assert.deepStrictEqual(encode(p.dps[5], 'auto'), { value: 3, type: 'enum' });
    assert.strictEqual(decode(p.dps[2], 24), 24);
    assert.deepStrictEqual(c.capabilitiesOptions.hvac_system_mode.values.map((v) => v.id), ['cool', 'dry', 'fan_only']);
  });

  it('AETZ01 option DPs update settings without blocking and never become capabilities', async () => {
    const Dev = require(path.join(ROOT, 'drivers/air_conditioner_aetz01/device.js'));
    const set = [];
    const d = Object.create(Dev.prototype);
    Object.assign(d, { getSetting: () => false, setSettings: async (s) => { set.push(s); } });
    assert.strictEqual(d._onProfileDP(30, true), undefined);
    await new Promise((r) => setTimeout(r, 5));
    assert.deepStrictEqual(set, [{ aetz01_swing: true }]);
  });

  it('removed combos carry approvedBy exemptions; moved couples are pinned and listed in couple-guard', () => {
    const f = JSON.parse(fs.readFileSync(path.join(ROOT, 'test/fixtures/athom-last-test-package-couples.json'), 'utf8'));
    const ex = f.exemptions.filter((e) => /^P3068/.test(e.reason));
    assert.strictEqual(ex.length, 12);
    for (const e of ex) {assert.ok(e.approvedBy && e.date, `${e.mfr}|${e.pid}`);}
    const pins = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8')).couples;
    for (const [m, p, drv] of [['_TZE200_jowqowye', 'TS0601', 'wall_dimmer_tuya'], ['_TZE284_ikul00sx', 'TS0601', 'fan_light_tuya_5_levels'],
      ['_TZE200_snfdqllf', 'TS0601', 'air_conditioner_aetz01'], ['VABRATE', 'Excellux', 'vibration_sensor_excellux_zg103v']]) {
      assert.ok(pins.some((x) => x.mfr === m && x.pid === p && x.driverId === drv), `${m}|${p}`);
    }
    const cg = require(path.join(ROOT, 'lib/data/couple-guard.json')).drivers;
    assert.deepStrictEqual(cg.fan_light_tuya_5_levels.mfrs, { _tze284_ikul00sx: ['TS0601'] });
    assert.deepStrictEqual(cg.vibration_sensor_excellux_zg103v.mfrs, { vabrate: ['Excellux'] });
  });
});
