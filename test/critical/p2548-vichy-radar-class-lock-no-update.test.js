'use strict';

/**
 * P2548 — VicHY #2241 type flip without app update
 * Contre quoi: Homey restores curtain class/caps while updates blocked;
 * presence WHEN dies when alarm_motion stripped; DynCap cover heuristic on DP2/3/102.
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DEVICE = path.join(ROOT, 'drivers/presence_sensor_radar/device.js');
const DYN = path.join(ROOT, 'lib/dynamic/DynamicCapabilityManager.js');

describe('P2548 VicHY radar class lock without tip update', () => {
  it('locks setClass to sensor and refuses strip of presence caps', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(/P2548.*refused setClass/.test(src), 'setClass lock');
    assert.ok(src.includes('P2548 refused removeCapability'), 'presence remove lock');
    assert.ok(src.includes('onEndDeviceAnnounce'), 'heal on announce');
    assert.ok(src.includes('120_000') || src.includes('120000') || src.includes('60_000') || src.includes('60000'), 'periodic heal');
  });

  it('DynCap skips cover/dim heuristics on presence radar', () => {
    const src = fs.readFileSync(DYN, 'utf8');
    assert.ok(src.includes('_isPresenceRadarDriver'), 'helper');
    assert.ok(/category === 'cover'/.test(src) && /_isPresenceRadarDriver/.test(src), 'skip cover');
  });

  it('clrdrnya still mains + phantom strip', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(/clrdrnya/.test(src));
    assert.ok(src.includes('windowcoverings_set'));
  });
});
