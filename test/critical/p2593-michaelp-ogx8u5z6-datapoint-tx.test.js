'use strict';

/**
 * P2593 — Michaelp #2253: ZG253 TRV ogx8u5z6 setpoint TX
 *
 * Contre quoi:
 * - `_sendTuyaDP` calls `tuya.datapoint({ dp, value, type })` → Homey
 *   "tuya.datapoint: value is an unexpected property"
 * - no EF00 manager / UniversalDriverInit path
 * - no post-init DP refresh → caps stay null
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DEVICE = path.join(ROOT, 'drivers/device_radiator_valve/device.js');
const SMART = path.join(ROOT, 'drivers/device_radiator_valve_smart/device.js');

describe('P2593 Michaelp ogx8u5z6 TRV datapoint TX', () => {
  it('device_radiator_valve never sends {value,type} to cluster.datapoint', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('P2593'));
    assert.ok(src.includes('tuyaEF00Manager'));
    assert.ok(src.includes('UniversalDriverInit'));
    assert.ok(src.includes('_scheduleTrvDpRefresh'));
    // Contre quoi: live call site only (ignore docs/comments)
    const callSites = src.split('\n').filter((l) => !/^\s*(\*|\/\/)/.test(l) && /datapoint\s*\(/.test(l));
    assert.ok(callSites.every((l) => !/\bvalue\s*,\s*type\b/.test(l) && !/\bvalue\s*:\s*/.test(l.replace(/datatype/g, ''))));
    assert.ok(!callSites.some((l) => /\{\s*dp\s*,\s*value\s*,\s*type/.test(l)));
  });

  it('device_radiator_valve_smart shares fixed _sendTuyaDP', () => {
    const src = fs.readFileSync(SMART, 'utf8');
    assert.ok(src.includes('UniversalDriverInit') || src.includes('tuyaEF00Manager'));
    assert.ok(!/datapoint\(\s*\{\s*dp\s*,\s*value\s*,\s*type/.test(src));
  });

  it('me167 setpoint still uses DP4 for ogx8u5z6 family', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.match(src, /profile === 'me167'\s*\?\s*4\s*:\s*3/);
    assert.ok(src.includes('ogx8u5z6'));
  });
});
