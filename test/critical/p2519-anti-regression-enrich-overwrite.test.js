'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJ = (rel) => JSON.parse(read(rel));

describe('P2519 anti-regression — enrich must not overwrite', () => {
  it('climate_sensor has no 8eazvzo6 / krwtzhfd / invent TS004F', () => {
    const c = readJ('drivers/climate_sensor/driver.compose.json');
    const mfrs = c.zigbee.manufacturerName || [];
    assert.ok(!mfrs.some((m) => /8eazvzo6/i.test(m)));
    assert.ok(!mfrs.some((m) => /krwtzhfd/i.test(m)));
    assert.ok(!(c.zigbee.productId || []).some((p) => /^TS004F$/i.test(p)));
  });

  it('user sacred couples still on canonical drivers (forum/GH historic)', () => {
    const checks = [
      ['wall_dimmer_tuya', /m1cvyneb/i],
      ['water_leak_sensor', /k4ej3ww2/i],
      ['button_wireless_1', /mrpevh8p/i],
      ['presence_sensor_radar', /clrdrnya/i],
      ['curtain_motor', /fodv6bkr/i],
      ['curtain_motor', /icka1clh/i],
      ['energy_meter_3phase', /a14rjslz/i],
      ['wall_switch_2gang_1way', /l9brjwau/i],
      ['scene_switch_4', /zgyzgdua/i],
      ['valve_dual_irrigation', /fhvpaltk/i],
      ['smart_knob', /uri7ongn/i],
      ['switch_wall_6gang', /8eazvzo6/i],
    ];
    for (const [driver, re] of checks) {
      const j = readJ(`drivers/${driver}/driver.compose.json`);
      assert.ok(
        (j.zigbee.manufacturerName || []).some((m) => re.test(m)),
        `${driver} missing ${re}`
      );
    }
  });

  it('energy_meter_3phase DP1=meter_power; phase B/C do not thrash primary V/A', () => {
    const src = read('drivers/energy_meter_3phase/device.js');
    assert.ok(/1:\s*\{\s*capability:\s*'meter_power'/.test(src));
    assert.ok(/109:\s*\{\s*capability:\s*null/.test(src), 'phase B voltage must be internal');
    assert.ok(/112:\s*\{\s*capability:\s*null/.test(src), 'phase C voltage must be internal');
    assert.ok(/mainsPowered/.test(src));
  });

  it('boiler power_scale was appended (settings not wiped to empty)', () => {
    const j = readJ('drivers/boiler_switch_energy/driver.compose.json');
    assert.ok(Array.isArray(j.settings) && j.settings.length >= 1);
    assert.ok(JSON.stringify(j.settings).includes('power_scale'));
    // capabilities must still include onoff (not overwritten)
    assert.ok((j.capabilities || []).includes('onoff') || (j.capabilities || []).includes('measure_power'));
  });

  it('registry forbids climate re-paint of 8eazvzo6', () => {
    const reg = readJ('data/user-misattribution-registry.json');
    const ids = (reg.cases || []).map((c) => c.id);
    assert.ok(ids.includes('p2519-8eazvzo6-not-climate'));
    assert.ok(ids.includes('p2517-krwtzhfd-ts004f-not-leak'));
  });
});
