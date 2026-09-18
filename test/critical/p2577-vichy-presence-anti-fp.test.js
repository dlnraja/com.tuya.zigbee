'use strict';

/**
 * P2577 — VicHY #2247 fine anti false-positive (screenshots + diag 8d9d0199)
 *
 * Contre quoi:
 * - distance units object → Homey UI "0 [object Object]"
 * - /^alarm_motion/ lock blocked stripping phantom zoneN tiles
 * - soft-clear then sticky DP1 re-paints Sí forever in empty bathroom
 * - no antiFalsePositive gate / sticky-ignore after soft-clear
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2577 VicHY MTG075 anti false-positive', () => {
  it('MTG075 config enables antiFalsePositive + sticky ignore + faster soft-clear', () => {
    const { getSensorConfig } = require(path.join(ROOT, 'drivers/presence_sensor_radar/configs.js'));
    const cfg = getSensorConfig('_TZE204_clrdrnya', 'TS0601');
    assert.ok(cfg);
    assert.strictEqual(cfg.antiFalsePositive, true);
    assert.ok(cfg.softClearZeroDistanceMs <= 60000);
    assert.ok(cfg.softClearStableDistanceMs <= 90000);
    assert.ok(cfg.softClearIgnoreStickyDp1Ms >= 60000);
    assert.ok(cfg.presenceConfirmMs >= 2000);
    assert.strictEqual(cfg.dpMap[1].unreliable, false);
  });

  it('compose distance units are string m (not localized object)', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'),
      'utf8',
    ));
    const units = compose.capabilitiesOptions?.['measure_luminance.distance']?.units;
    assert.strictEqual(typeof units, 'string');
    assert.strictEqual(units, 'm');
  });

  it('device.js gates sticky DP1 + coerces distance + unlocks zone strip', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/device.js'),
      'utf8',
    );
    assert.ok(src.includes('_gatePresenceAgainstFalsePositive'));
    assert.ok(src.includes('_coerceDistanceMeters'));
    assert.ok(src.includes('_armStickyDp1Ignore'));
    assert.ok(src.includes('P2577 distance units coerced'));
    assert.ok(src.includes("cap === 'alarm_motion'"));
    assert.ok(!src.includes('/^alarm_motion|^alarm_human$|^alarm_presence$|^button\\.1$/'));
  });

  it('anti-FP gate drops sticky true until distance corroborates (pure)', () => {
    // Pure Contre quoi clone of device.js gate (avoid Homey ZigBeeDevice require).
    function distanceCorroborates(samples, luxRate = 0) {
      const now = Date.now();
      const recent = (samples || []).filter((s) => now - s.t < 15_000);
      if (recent.length >= 2) {
        let min = recent[0].d;
        let max = recent[0].d;
        for (const s of recent) {
          if (s.d < min) min = s.d;
          if (s.d > max) max = s.d;
        }
        if (max - min >= 0.25) return true;
      }
      return luxRate > 8;
    }
    function gate(presence, { ignoreUntil, samples, luxRate = 0 }) {
      if (!presence) return false;
      if (ignoreUntil && Date.now() < ignoreUntil) {
        return distanceCorroborates(samples, luxRate) ? true : null;
      }
      return true;
    }
    const ignoreUntil = Date.now() + 60_000;
    assert.strictEqual(gate(true, { ignoreUntil, samples: [{ d: 0, t: Date.now() }] }), null);
    assert.strictEqual(gate(false, { ignoreUntil, samples: [] }), false);
    assert.strictEqual(gate(true, {
      ignoreUntil,
      samples: [{ d: 0.1, t: Date.now() - 2000 }, { d: 1.4, t: Date.now() }],
    }), true);
  });

  it('SensorConfigs + TuyaSensorDatabase mirror antiFalsePositive', () => {
    const sc = require('../../lib/data/SensorConfigs').MTG075_ZB_RL_RELAY;
    assert.strictEqual(sc.antiFalsePositive, true);
    const tuyaSrc = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaSensorDatabase.js'), 'utf8');
    assert.ok(tuyaSrc.includes('antiFalsePositive: true'));
    assert.ok(tuyaSrc.includes('softClearIgnoreStickyDp1Ms'));
  });
});
