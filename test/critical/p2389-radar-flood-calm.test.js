'use strict';

/**
 * P2389 — Presence radar Zigbee flood calm
 * VicHY timeline: "Presencia… flooding (196 msg/min)" — known Tuya mmWave firmware class.
 * App cannot stop airtime; must (1) use radar RX budget, (2) suppress Homey alert,
 * (3) coalesce DP9 distance / DP104 lux on MTG075/clrdrnya.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('P2389 — radar flood calm', () => {
  it('UniversalThrottleManager exposes radar RX budget ≥250/min', () => {
    const { TX_RX_LIMITS, isRadarFloodDriver, trackRx } = require('../../lib/utils/UniversalThrottleManager');
    assert.ok(TX_RX_LIMITS.radar, 'radar limits defined');
    assert.ok(TX_RX_LIMITS.radar.rxPerMinute >= 250, 'radar RX budget covers ~200 msg/min firmware spam');
    assert.strictEqual(isRadarFloodDriver('presence_sensor_radar'), true);
    assert.strictEqual(isRadarFloodDriver('switch_1gang'), false);
    const id = `p2389-${Date.now()}`;
    let last;
    for (let i = 0; i < 196; i++) {last = trackRx(id, 'radar');}
    assert.strictEqual(last.exceeded, false, '196 msg/min must not exceed radar budget');
  });

  it('TuyaZigbeeDevice skips Homey flood notification for radar drivers', () => {
    const src = read('lib/tuya/TuyaZigbeeDevice.js');
    assert.ok(src.includes('isRadarFloodDriver'), 'imports radar classifier');
    assert.ok(src.includes('[P2389] Radar firmware chatty'), 'log-only path for radars');
    assert.ok(src.includes("rxType = isRadarFloodDriver(driverId) ? 'radar'"), 'trackRx uses radar type');
  });

  it('MTG075/clrdrnya config enables floodCalm + DP throttle for distance/lux', () => {
    const { SENSOR_CONFIGS, getSensorConfig } = require('../../drivers/presence_sensor_radar/configs');
    const cfg = SENSOR_CONFIGS.MTG075_ZB_RL_RELAY || getSensorConfig('_TZE204_clrdrnya');
    assert.ok(cfg, 'clrdrnya config resolved');
    assert.strictEqual(cfg.floodCalm, true);
    assert.ok(cfg.dpThrottleMs[9] >= 2000, 'DP9 distance throttled');
    assert.ok(cfg.dpThrottleMs[104] >= 4000, 'DP104 lux throttled');
    const deviceSrc = read('drivers/presence_sensor_radar/device.js');
    assert.ok(deviceSrc.includes('_shouldSkipFloodCalmDp'), 'coalesce helper present');
  });
});
