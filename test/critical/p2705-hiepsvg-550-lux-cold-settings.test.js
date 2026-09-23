'use strict';

/**
 * P2705 — GH#550 HiepSVG residual @ 9.0.1207 (gkfbdvyx+TS0601)
 *
 * Contre quoi:
 * - Lux dead while distance still ticks → cold-stream AND-gate never re-armed DP103
 * - Ceiling settings (range/sensitivity/delay) had no `setting:` → MCU never got Homey values
 * - Sticky presence hung after leave → survival/sticky watchdogs gated on floodCalm only
 *
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DEVICE = path.join(ROOT, 'drivers/presence_sensor_radar/device.js');
const CONFIGS = path.join(ROOT, 'drivers/presence_sensor_radar/configs.js');

describe('P2705 HiepSVG #550 lux-cold + settings wire + sticky', () => {
  it('ceiling config maps Homey settings → DP2/4/102/105', () => {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const mod = require(CONFIGS);
    const c = (mod.SENSOR_CONFIGS || mod)['ZY_M100_CEILING_24G']
      || Object.values(mod.SENSOR_CONFIGS || mod).find((x) => x && x.configName === 'ZY_M100_CEILING_24G');
    assert.ok(c, 'ZY_M100_CEILING_24G config required');
    assert.equal(c.dpMap[2].setting, 'radar_sensitivity');
    assert.equal(c.dpMap[4].setting, 'detection_range');
    assert.equal(c.dpMap[102].setting, 'entry_sensitivity');
    assert.equal(c.dpMap[105].setting, 'departure_delay');
    assert.equal(c.survivalWatchdog, true);
    assert.equal(c.enableFindSwitchOnBoot, true);
  });

  it('device splits lux-cold from both-cold + arms ceiling sticky', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('enableFindSwitchOnBoot'));
    assert.ok(src.includes('survivalWatchdog'));
    assert.ok(/_ceilingLuxIsCold/.test(src));
    assert.ok(src.includes('poll-lux-cold') || src.includes('lux-cold-watchdog'));
    assert.ok(src.includes('P2705'));
  });

  it('sacred couple still on presence_sensor_radar', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'),
      'utf8',
    ));
    const mfr = compose.zigbee?.manufacturerName || [];
    assert.ok(mfr.some((m) => /gkfbdvyx/i.test(String(m))));
  });

  it('npm check:p2705 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2705']);
  });
});
