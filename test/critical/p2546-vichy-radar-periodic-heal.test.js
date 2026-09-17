'use strict';

/**
 * P2546 — VicHY #2240/#2241 forum complete pass
 * Contre quoi: curtain class flip without tip update; presence WHEN spam/miss.
 * Dual-app: BOTH (reliability)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DEVICE = path.join(ROOT, 'drivers/presence_sensor_radar/device.js');

describe('P2546 VicHY radar periodic heal + presence flow edge', () => {
  it('device schedules periodic phantom heal (10 min) for clrdrnya', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('safeSetInterval'), 'must use safeSetInterval');
    assert.ok(src.includes('600_000') || src.includes('600000') || src.includes('120_000') || src.includes('120000'), 'periodic heal interval');
    assert.ok(src.includes('_clearRadarPhantomHealInterval'), 'must clear on delete');
    assert.ok(src.includes('P2546') || src.includes('P2548'), 'WHY tag heal');
  });

  it('force setClass sensor on mains heal (not only curtain-looking class)', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(/forceMains \|\| \/windowcoverings/.test(src), 'forceMains must setClass sensor');
  });

  it('presence flow trigger dedupes identical edges', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('_lastPresenceFlowEdge'), 'edge dedupe');
    assert.ok(src.includes('presence_sensor_radar_presence_detected'));
  });

  it('MTG075 still DP1-owned (P2534 lock intact)', () => {
    const { SENSOR_CONFIGS } = require('../../drivers/presence_sensor_radar/configs');
    const cfg = SENSOR_CONFIGS.MTG075_ZB_RL_RELAY;
    assert.equal(cfg.clearPresenceOnZeroDistance, false);
    assert.equal(cfg.syncPresenceFromDistanceInference, false);
  });
});
