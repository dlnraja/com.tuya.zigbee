'use strict';

/**
 * P2818 — Cross-ref ZHA#5286 / Z2M vs our gnpflcoq 4in1 + ANTIK fl8cuafl TRV
 *
 * Contre quoi:
 * - Flow/settings must not TX DP102 as fading_time on gnpflcoq (temp_compensate).
 * - DP9/12 handled as sensitivity/delay, not distance/lux.
 * - fl8cuafl stays on device_radiator_valve ME167 soft profile (ANTIK TV02-class).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2818 gnpflcoq ZHA#5286 DP map + fl8cuafl TRV', () => {
  it('device.js has gnpflcoq couple-aware DP9/12/102 paths', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers', 'motion_sensor_radar_mmwave', 'device.js'),
      'utf8',
    );
    assert.match(src, /_isGnpflcoq4in1/);
    assert.match(src, /sendGnpflcoqSetting/);
    assert.match(src, /P2818/);
    assert.match(src, /pir_delay|temp_compensate/);
    assert.match(src, /ZHA#5286/);
  });

  it('driver.js Flow fading_time uses sendGnpflcoqSetting (not blind DP102)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers', 'motion_sensor_radar_mmwave', 'driver.js'),
      'utf8',
    );
    assert.match(src, /sendGnpflcoqSetting/);
    assert.match(src, /set_fading_time[\s\S]*sendGnpflcoqSetting|sendGnpflcoqSetting[\s\S]*fading_time/);
  });

  it('fl8cuafl on device_radiator_valve + me167 soft tail', () => {
    const compose = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers', 'device_radiator_valve', 'driver.compose.json'), 'utf8'),
    );
    const mfr = (compose.zigbee.manufacturerName || []).map(String);
    assert.ok(mfr.some((m) => /_TZE200_fl8cuafl/i.test(m)));
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers', 'device_radiator_valve', 'device.js'),
      'utf8',
    );
    assert.match(src, /fl8cuafl/);
  });

  it('Ef00OnlyInterview includes both couples', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'zigbee', 'Ef00OnlyInterview.js'), 'utf8');
    assert.match(src, /gnpflcoq/i);
    assert.match(src, /fl8cuafl/i);
  });
});
