'use strict';

/**
 * P2530 — Recent-device complementary variants + capabilities Contre quoi
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const hasMfr = (compose, re) => (compose.zigbee?.manufacturerName || []).some((m) => re.test(String(m)));
const hasCap = (compose, id) => (compose.capabilities || []).some((c) => String(c) === id);

describe('P2530 recent variant + capability completer', () => {
  it('completer script + ComplementaryMerge exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/recent-variant-capability-completer.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'lib/enrichment/ComplementaryMerge.js')));
  });

  it('curtain_motor keeps Moes/AM43/tubular OEM families + cover caps', () => {
    const c = readJson('drivers/curtain_motor/driver.compose.json');
    assert.ok(hasMfr(c, /_TZE204_5slehgeo/i));
    assert.ok(hasMfr(c, /_TZE200_5slehgeo/i));
    assert.ok(hasMfr(c, /_TZE284_5slehgeo/i));
    assert.ok(hasMfr(c, /icka1clh/i));
    assert.ok(hasMfr(c, /fodv6bkr/i));
    assert.ok(hasMfr(c, /3mzb0sdz/i));
    assert.ok(hasCap(c, 'windowcoverings_state'));
    assert.ok(hasCap(c, 'windowcoverings_set'));
    assert.ok(hasCap(c, 'measure_battery'));
  });

  it('presence_sensor_radar keeps gkfbdvyx/clrdrnya OEM + alarm_human (not phantom battery)', () => {
    const c = readJson('drivers/presence_sensor_radar/driver.compose.json');
    assert.ok(hasMfr(c, /_TZE204_gkfbdvyx/i));
    assert.ok(hasMfr(c, /_TZE200_gkfbdvyx/i));
    assert.ok(hasMfr(c, /_TZE284_gkfbdvyx/i));
    assert.ok(hasMfr(c, /clrdrnya/i));
    assert.ok(hasCap(c, 'alarm_motion'));
    assert.ok(hasCap(c, 'alarm_human'));
    assert.ok(hasCap(c, 'measure_luminance'));
    assert.ok(!hasCap(c, 'measure_battery'), 'mains radar must not gain phantom battery');
  });

  it('wall_dimmer_tuya keeps m1cvyneb TZE200/204/284 + onoff/dim', () => {
    const c = readJson('drivers/wall_dimmer_tuya/driver.compose.json');
    assert.ok(hasMfr(c, /_TZE284_m1cvyneb/i));
    assert.ok(hasMfr(c, /_TZE204_m1cvyneb/i));
    assert.ok(hasMfr(c, /_TZE200_m1cvyneb/i));
    assert.ok(hasCap(c, 'onoff'));
    assert.ok(hasCap(c, 'dim'));
    // Homey publish: firmwareUpdates.device.manufacturerName must exist in zigbee list (exact)
    const fw = c.firmwareUpdates?.updates?.[0]?.device?.manufacturerName || [];
    for (const m of fw) {
      assert.ok(
        (c.zigbee.manufacturerName || []).includes(m),
        `firmwareUpdates mfr ${m} must be listed in zigbee.manufacturerName`,
      );
    }
  });

  it('TZ3000 recent seeds keep case variants + battery where expected', () => {
    const btn = readJson('drivers/button_wireless_1/driver.compose.json');
    const scene = readJson('drivers/scene_switch_4/driver.compose.json');
    const knob = readJson('drivers/smart_knob/driver.compose.json');
    assert.ok(hasMfr(btn, /_TZ3000_mrpevh8p/i));
    assert.ok(hasMfr(btn, /_tz3000_mrpevh8p/i));
    assert.ok(hasCap(btn, 'measure_battery'));
    assert.ok(hasMfr(scene, /_TZ3000_zgyzgdua/i));
    assert.ok(hasMfr(knob, /_TZ3000_uri7ongn/i));
  });

  it('kq1l5eu5 Moes SFC02 stays wall_curtain_switch (not curtain_motor)', () => {
    const motor = readJson('drivers/curtain_motor/driver.compose.json');
    const wall = readJson('drivers/wall_curtain_switch/driver.compose.json');
    assert.ok(!hasMfr(motor, /kq1l5eu5/i), 'anti-bot: kq1l5eu5 forbidden on curtain_motor');
    assert.ok(hasMfr(wall, /_TZE284_kq1l5eu5/i));
    assert.ok(hasMfr(wall, /_TZE200_kq1l5eu5/i) || hasMfr(wall, /_TZE204_kq1l5eu5/i));
    assert.ok(hasCap(wall, 'windowcoverings_state') || hasCap(wall, 'windowcoverings_set') || hasCap(wall, 'onoff'));
  });

  it('P2530e fleet seeds: soil/din/leak/4gang/plug/curtain-switch OEM + caps', () => {
    const soil = readJson('drivers/soil_sensor/driver.compose.json');
    const din = readJson('drivers/din_rail_meter/driver.compose.json');
    const leak = readJson('drivers/water_leak_sensor/driver.compose.json');
    const sw4 = readJson('drivers/wall_switch_4gang_1way/driver.compose.json');
    const plug = readJson('drivers/plug_energy_monitor/driver.compose.json');
    const valve = readJson('drivers/valve_dual_irrigation/driver.compose.json');
    const btn4 = readJson('drivers/button_wireless_4/driver.compose.json');

    assert.ok(hasMfr(soil, /_TZE284_nt4pquef/i));
    assert.ok(hasMfr(soil, /_TZE200_nt4pquef/i) || hasMfr(soil, /_TZE204_nt4pquef/i));
    assert.ok(hasCap(soil, 'measure_humidity.soil'));

    assert.ok(hasMfr(din, /_TZE284_6ocnqlhn/i));
    assert.ok(hasMfr(din, /_TZE200_6ocnqlhn/i) || hasMfr(din, /_TZE204_6ocnqlhn/i));
    assert.ok(hasCap(din, 'measure_power'));
    assert.ok(hasCap(din, 'meter_power'));

    assert.ok(hasMfr(leak, /_TZ3000_k4ej3ww2/i));
    assert.ok(hasCap(leak, 'alarm_water'));

    assert.ok(hasMfr(sw4, /_TZ3000_lwthnp7j/i));
    assert.ok(hasCap(sw4, 'onoff.gang4'));

    assert.ok(hasMfr(plug, /_TZ3000_okaz9tjs/i));
    assert.ok(hasMfr(plug, /_TZ3210_fgwhjm9j/i));
    assert.ok(hasCap(plug, 'onoff'));

    assert.ok(hasMfr(valve, /_TZE284_fhvpaltk/i));
    assert.ok(hasCap(valve, 'onoff.valve_1'));
    assert.ok(hasCap(valve, 'onoff.valve_2'));

    assert.ok(hasMfr(btn4, /_TZ3000_xffhmvhv/i));
    assert.ok(hasMfr(btn4, /_TZ3000_abrsvsou/i));
  });
});
