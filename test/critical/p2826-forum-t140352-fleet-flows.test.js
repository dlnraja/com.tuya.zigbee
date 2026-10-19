'use strict';

/**
 * P2826 — T140352 remaining subjects + flow fleet harden (silent)
 * Contre quoi:
 * - LCD 9ern5sfh drifts back to climate_sensor in app.json
 * - presence/mmwave declared WHEN cards never warmed → AF card flicker (VicHY #2255)
 * - illuminance/distance WHEN never fired from device
 * - SPI brightness_changed wiped to empty compose
 * Dual-app: BOTH reliability. No invent pid. No forum POST.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function compose(id) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}

function hasCouple(driverId, mfr, pid) {
  const c = compose(driverId);
  const m = (c.zigbee?.manufacturerName || []).map((x) => String(x).toLowerCase());
  const p = (c.zigbee?.productId || []).map((x) => String(x).toLowerCase());
  return m.includes(mfr.toLowerCase()) && p.includes(pid.toLowerCase());
}

describe('P2826 T140352 fleet + flow harden', () => {
  it('forum sacred couples stay on correct drivers', () => {
    assert.ok(hasCouple('lcdtemphumidsensor', '_TZE284_9ern5sfh', 'TS0601'));
    assert.ok(hasCouple('motion_sensor_radar_mmwave', '_TZE284_gnpflcoq', 'TS0601'));
    assert.ok(hasCouple('device_radiator_valve', '_TZE200_fl8cuafl', 'TS0601'));
    assert.ok(hasCouple('device_radiator_valve', '_TZE284_ogx8u5z6', 'TS0601'));
    assert.ok(hasCouple('soil_sensor', 'AOYAN', 'AY-303Z'));
    assert.ok(hasCouple('illuminance_sensor', '_TZ3000_7y90pany', 'ZG-106Z'));
    assert.ok(hasCouple('presence_sensor_radar', '_TZE204_clrdrnya', 'TS0601'));
    assert.ok(hasCouple('sensor_climate_temphumidsensor', '_TZ3210_ncw88jfq', 'TS0201'));
  });

  it('9ern5sfh exclusive to lcdtemphumidsensor (not climate_sensor)', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const has = (id) => (app.drivers.find((d) => d.id === id)?.zigbee?.manufacturerName || [])
      .some((m) => String(m).toLowerCase().includes('9ern5sfh'));
    assert.ok(has('lcdtemphumidsensor'));
    assert.ok(!has('climate_sensor'));
  });

  it('presence driver warms all declared WHEN cards incl. lux/distance', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/driver.js'), 'utf8');
    for (const id of [
      'presence_sensor_radar_motion_cleared',
      'presence_sensor_radar_illuminance_changed',
      'presence_sensor_radar_distance_changed',
    ]) {
      assert.match(src, new RegExp(id));
    }
    const device = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.match(device, /_emitRadarMeasureFlow/);
    assert.match(device, /P2826/);
  });

  it('mmwave driver warms declared WHEN cards (gnpflcoq 4in1)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/motion_sensor_radar_mmwave/driver.js'), 'utf8');
    assert.match(src, /motion_sensor_radar_mmwave_illuminance_changed/);
    assert.match(src, /P2826/);
  });

  it('climate LCD Wilhelm compose has ZCL+EF00 single EP', () => {
    const ep = compose('sensor_climate_temphumidsensor').zigbee?.endpoints?.['1'];
    const clusters = (ep?.clusters || []).map(Number);
    for (const c of [0, 1, 1026, 1029, 61184]) assert.ok(clusters.includes(c), String(c));
  });

  it('SPI flow: dead brightness_changed card dropped for the Athom bisect (19/10/2026, user-approved)', () => {
    const flow = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/led_controller_spi_tuya/driver.flow.compose.json'), 'utf8'
    ));
    assert.ok(!(flow.triggers || []).some((t) => t.id === 'led_controller_spi_tuya_brightness_changed'));
  });

  it('npm check:p2826 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2826']);
  });
});
