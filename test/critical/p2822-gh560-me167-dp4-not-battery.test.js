'use strict';

/**
 * P2822 — GH#560 TRV06 `_TZE200_rxq4iti9`+TS0601
 *
 * Contre quoi:
 * - Generic batteryDPs=[4,…] forwards DP4 before device ownership → Battery 100%
 * - Empty zb_manufacturer_name early boot → Profile A (DP4=measure_temperature)
 *   instead of me167 (DP4=target_temperature ÷10)
 *
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const MGR = path.join(ROOT, 'lib/tuya/TuyaEF00Manager.js');
const DEVICE = path.join(ROOT, 'drivers/device_radiator_valve/device.js');
const COMPOSE = path.join(ROOT, 'drivers/device_radiator_valve/driver.compose.json');

describe('P2822 GH#560 me167 DP4 not battery', () => {
  it('EF00 checks ownership + TRV setpoint before battery forward', () => {
    const src = fs.readFileSync(MGR, 'utf8');
    assert.ok(src.includes('_isTrvSetpointDpNotBattery'));
    assert.ok(src.includes('P2822'));
    assert.ok(src.includes('deviceOwnsDp'));
    assert.ok(src.includes('_isTrvSetpointDpNotBattery(dp)'));
    // Battery forward call site in active DP path must sit AFTER ownedMap resolution
    const ownedIdx = src.indexOf('const ownedMap = deviceDpMappings');
    const gateIdx = src.indexOf('_isTrvSetpointDpNotBattery(dp)');
    assert.ok(ownedIdx > 0, 'ownedMap present');
    assert.ok(gateIdx > ownedIdx, 'TRV battery gate after ownedMap');
  });

  it('radiator valve resolves mfr from store/zcl for me167 tails', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('_resolveMfr'));
    assert.ok(src.includes('rxq4iti9'));
    assert.ok(src.includes('P2822'));
  });

  it('compose keeps _TZE200_rxq4iti9 + TS0601 on device_radiator_valve', () => {
    const c = JSON.parse(fs.readFileSync(COMPOSE, 'utf8'));
    const mfrs = c.zigbee?.manufacturerName || [];
    const pids = c.zigbee?.productId || [];
    assert.ok(mfrs.some((m) => /rxq4iti9/i.test(String(m))));
    assert.ok(pids.some((p) => String(p).toUpperCase() === 'TS0601'));
  });

  it('npm check:p2822 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2822']);
  });
});
