'use strict';

/**
 * P2534 — VicHY #2240 / diag 74e5cae7 image: MTG075 presence = DP1 (Z2M),
 * not distance=0 clear. Contre quoi: bathroom timeline flip-flop kills Flow WHEN.
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2534 VicHY MTG075 presence DP1 ownership', () => {
  it('MTG075/clrdrnya does NOT clear presence on target_distance≈0', () => {
    const { SENSOR_CONFIGS } = require('../../drivers/presence_sensor_radar/configs');
    const cfg = SENSOR_CONFIGS.MTG075_ZB_RL_RELAY;
    assert.equal(cfg.clearPresenceOnZeroDistance, false);
    assert.equal(cfg.syncPresenceFromDistanceInference, false);
    assert.equal(cfg.dpMap[1].cap, 'alarm_motion');
    assert.equal(cfg.dpMap[9].cap, 'measure_luminance.distance');
    assert.equal(cfg.dpMap[104].cap, 'measure_luminance');
  });

  it('gkfbdvyx sticky family KEEPS zero-distance clear (P2509)', () => {
    const { SENSOR_CONFIGS } = require('../../drivers/presence_sensor_radar/configs');
    const cfg = SENSOR_CONFIGS.ZY_M100_CEILING_24G;
    assert.equal(cfg.clearPresenceOnZeroDistance, true);
    assert.equal(cfg.syncPresenceFromDistanceInference, true);
  });

  it('driver warms presence_detected trigger cards (P2534)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.js'),
      'utf8',
    );
    assert.ok(src.includes('presence_sensor_radar_presence_detected'));
    assert.ok(src.includes('getDeviceTriggerCard'));
  });

  it('mirrors in SensorConfigs + TuyaSensorDatabase stay aligned', () => {
    const a = require('../../lib/data/SensorConfigs').MTG075_ZB_RL_RELAY;
    const tuyaMod = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaSensorDatabase.js'), 'utf8');
    assert.equal(a.clearPresenceOnZeroDistance, false);
    assert.equal(a.syncPresenceFromDistanceInference, false);
    // Extract MTG075 block without fragile single-line regex
    const start = tuyaMod.indexOf("'MTG075_ZB_RL_RELAY'");
    const next = tuyaMod.indexOf("'ZY_M100_CEILING_24G'", start + 1);
    const block = tuyaMod.slice(start, next > start ? next : start + 1200);
    assert.match(block, /clearPresenceOnZeroDistance:\s*false/);
    assert.match(block, /syncPresenceFromDistanceInference:\s*false/);
  });
});
