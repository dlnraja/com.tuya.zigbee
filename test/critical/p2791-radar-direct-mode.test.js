'use strict';

/** P2791 / GH#550 — opt-in radar direct mode (raw DP → capability, no inference writes). */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { RADAR_DIRECT_CAPS, radarDirectValue: f } = require('../../lib/sensors/RadarDirectMode');

const root = path.join(__dirname, '../..');

describe('P2791 radar direct mode', () => {
  it('maps the ceiling presence enum (0 none, 1 presence, 2 move) and honours invert', () => {
    const m = { cap: 'alarm_motion', enumMap: { 0: false, 1: true, 2: true } };
    assert.deepEqual(f(m, 0), { cap: 'alarm_motion', value: false });
    assert.deepEqual(f(m, 1), { cap: 'alarm_motion', value: true });
    assert.deepEqual(f(m, 2), { cap: 'alarm_motion', value: true });
    assert.deepEqual(f(m, true), { cap: 'alarm_motion', value: true });
    assert.deepEqual(f(m, 1, { invert: true }), { cap: 'alarm_motion', value: false });
  });
  it('distance: dm preferred, cm only beyond the profile range; lux as-is', () => {
    const d = { cap: 'measure_luminance.distance', preferDivisor: 10, maxMeters: 9 };
    assert.equal(f(d, 31).value, 3.1);
    assert.equal(f(d, 310).value, 3.1);
    assert.equal(f(d, 0).value, 0);
    assert.equal(f({ cap: 'measure_luminance.distance', divisor: 100 }, 250).value, 2.5);
    assert.equal(f({ cap: 'measure_luminance', type: 'lux_direct' }, 420).value, 420);
    assert.equal(f(d, 50, { scale: 'cm' }).value, 0.5);
    assert.equal(f(d, 50, { scale: 'dm' }).value, 5);
  });

  it('ZY-M100-24GV2 exact layout for _TZE204_7gclukjs (DP103 lux, DP104 presence, DP9 ÷10)', () => {
    const { getSensorConfig } = require('../../drivers/presence_sensor_radar/configs');
    const c = getSensorConfig('_TZE204_7gclukjs', 'TS0601');
    assert.equal(c.configName, 'ZY_M100_24GV2');
    assert.equal(c.dpMap[103].cap, 'measure_luminance');
    assert.equal(c.dpMap[104].cap, 'alarm_motion');
    assert.equal(c.dpMap[9].divisor, 10);
    assert.equal(getSensorConfig('_TZE200_7gclukjs', 'TS0601').configName, 'DEFAULT');
  });
  it('settings / internal DPs are not handled directly', () => {
    assert.equal(f({ cap: null, setting: 'radar_sensitivity' }, 7), null);
    assert.equal(f({ cap: null, internal: 'illuminance_v2_compat' }, 1), null);
    assert.equal(f(undefined, 1), null);
    assert.ok(RADAR_DIRECT_CAPS.has('alarm_human'));
  });
  it('setting is opt-in (default false) in compose and app.json, and the driver is wired', () => {
    const s = JSON.parse(fs.readFileSync(path.join(root, 'drivers/presence_sensor_radar/driver.settings.compose.json'), 'utf8'));
    assert.equal(s.find((x) => x.id === 'radar_direct_mode').value, false);
    const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
    const d = app.drivers.find((x) => x.id === 'presence_sensor_radar');
    assert.equal(d.settings.find((x) => x.id === 'radar_direct_mode').value, false);
    const src = fs.readFileSync(path.join(root, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.match(src, /this\._radarDirectMode\(\) && RADAR_DIRECT_CAPS\.has\(capability\) && !this\._radarDirectWrite/);
    assert.match(src, /this\._radarDirectMode\(\) && this\._handleDirectDP\(dpId, value, mapping, config\)/);
  });
});

describe('P2791 — _TZ3000_ywagc4rj humidity ×10 scale', () => {
  it('is listed as a ×10 humidity manufacturer and the climate driver uses the /10 path', () => {
    // Source checks only: requiring the base pulls the Homey runtime.
    const src = fs.readFileSync(path.join(root, 'lib/devices/UnifiedSensorBase.js'), 'utf8');
    const set = src.slice(src.indexOf('ZCL_HUMIDITY_X10_MFRS = new Set(['), src.indexOf(']);', src.indexOf('ZCL_HUMIDITY_X10_MFRS = new Set([')));
    assert.match(set, /'_tz3000_ywagc4rj'/);
    assert.match(src, /X10\.has\(this\._resolveZclHumidityMfr\(\)\)\) \{\s*return Math\.round\(n \/ 10\)/);
    const dev = fs.readFileSync(path.join(root, 'drivers/sensor_climate_temphumidsensor/device.js'), 'utf8');
    assert.match(dev, /_isZclHumidityX10\?\.\(\) \? value \/ 10 : value \/ 100/);
  });
});
