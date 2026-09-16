'use strict';

/**
 * P2511 — VicHY clrdrnya MTG075 residual after tip update
 * Contre quoi: blind/curtain reinject + sticky presence + phantom battery/tuya_battery_low on 220V
 *
 * Couple: _TZE204_clrdrnya + TS0601 → presence_sensor_radar
 * Diags: 0e28d470 / c5165a37 / 4217d5e3
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const IntelligentPresenceInference = require('../../lib/sensors/IntelligentPresenceInference');

describe('P2511 VicHY clrdrnya MTG075 residual', () => {
  it('MTG075 config: sticky DP1 unreliable; presence owned by DP1 (P2534)', () => {
    const { SENSOR_CONFIGS } = require('../../drivers/presence_sensor_radar/configs');
    const cfg = SENSOR_CONFIGS.MTG075_ZB_RL_RELAY;
    assert.ok(cfg);
    assert.equal(cfg.mainsPowered, true);
    // WHY(P2534): zero-distance clear caused bathroom flip-flop / dead presence WHEN
    assert.equal(cfg.clearPresenceOnZeroDistance, false);
    assert.equal(cfg.syncPresenceFromDistanceInference, false);
    assert.equal(cfg.dpMap[1].unreliable, true);
    assert.equal(cfg.dpMap[1].useInference, true);
    assert.ok(cfg.sensors.some((m) => /clrdrnya/i.test(m)));
  });

  it('SensorConfigs + TuyaSensorDatabase mirror MTG DP1 ownership (P2534)', () => {
    const SENSOR_CONFIGS = require('../../lib/data/SensorConfigs');
    const cfg = SENSOR_CONFIGS.MTG075_ZB_RL_RELAY;
    assert.ok(cfg);
    assert.equal(cfg.clearPresenceOnZeroDistance, false);
    assert.equal(cfg.syncPresenceFromDistanceInference, false);
    assert.equal(cfg.dpMap[1].unreliable, true);
    const tuyaSrc = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaSensorDatabase.js'), 'utf8');
    assert.ok(/MTG075_ZB_RL_RELAY[\s\S]{0,900}unreliable:\s*true/.test(tuyaSrc));
    assert.ok(tuyaSrc.includes('clearPresenceOnZeroDistance'));
  });

  it('distance≈0 clears sticky presence (inference Contre quoi)', () => {
    const inf = new IntelligentPresenceInference({ log() {} });
    inf.updateDistance(2.0);
    assert.equal(inf.updatePresenceDP(true, { unreliable: true }), true);
    assert.equal(inf.updateDistance(0), false);
  });

  it('device.js strips tuya_battery_low + windowcoverings on mains heal', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.ok(src.includes('tuya_battery_low'), 'P2511 tuya_battery_low strip');
    assert.ok(src.includes('_healRadarPhantomCaps'));
    assert.ok(src.includes('windowcoverings_set'));
    assert.ok(src.includes('1_800_000'), '30min re-heal');
  });

  it('compose keeps clrdrnya+TS0601 without battery Energy', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'), 'utf8'));
    const mfrs = (compose.zigbee?.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.ok(mfrs.some((m) => m.includes('clrdrnya')));
    assert.ok((compose.zigbee?.productId || []).includes('TS0601'));
    assert.ok(!compose.capabilities.includes('measure_battery'));
    assert.ok(!compose.energy?.batteries?.length);
  });
});
