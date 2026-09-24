'use strict';

/**
 * P2719 — GH#550 HiepSVG @ 9.0.1222 (_TZE204_gkfbdvyx+TS0601)
 *
 * Contre quoi:
 * - Soft-clear skipped when clearPresenceOnZeroDistance (ghost 2–3m after leave)
 * - Survival watchdog reset on every calm lux/distance → departure_delay ignored
 * - Motion flicker wiped human presence (Z2M none|presence|move not split)
 * - Sticky-ignore lifted by stagnant ghost distance
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

describe('P2719 HiepSVG #550 sticky leave + motion/presence split', () => {
  it('ceiling config: splitMotionPresence + soft-clear + antiFP + survival', () => {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const mod = require(CONFIGS);
    const c = (mod.SENSOR_CONFIGS || mod).ZY_M100_CEILING_24G
      || Object.values(mod.SENSOR_CONFIGS || mod).find((x) => x && x.configName === 'ZY_M100_CEILING_24G');
    assert.ok(c);
    assert.equal(c.splitMotionPresence, true);
    assert.equal(c.survivalWatchdog, true);
    assert.equal(c.antiFalsePositive, true);
    assert.equal(c.clearPresenceOnZeroDistance, true);
    assert.ok(Number(c.softClearStableDistanceMs) >= 60_000);
    assert.equal(c.dpMap[105].setting, 'departure_delay');
  });

  it('soft-clear no longer early-returns on clearPresenceOnZeroDistance', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('P2719 / GH#550'));
    assert.ok(src.includes('ceiling gkfbdvyx must soft-clear stagnant'));
    // Contre quoi: old gate that disabled soft-clear for ceiling
    assert.ok(!/if \(config\.clearPresenceOnZeroDistance\) return;/.test(src));
  });

  it('survival watchdog skips reset on calm lux/distance', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('_isMeaningfulSurvivalLife'));
    assert.ok(src.includes('stagnant lux/distance must not reset'));
    assert.match(src, /if \(this\._survivalWatchdogTimer && !this\._isMeaningfulSurvivalLife\(reason\)\)/);
  });

  it('split motion/presence + sticky-ignore blocks ghost re-assert', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('splitMotionPresence'));
    assert.ok(src.includes('P2719 DP1 none'));
    assert.ok(src.includes('skip distance→presence (sticky-ignore'));
    assert.ok(src.includes('during sticky-ignore after leave, stagnant ghost'));
  });

  it('npm check:p2719 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2719']);
  });
});
