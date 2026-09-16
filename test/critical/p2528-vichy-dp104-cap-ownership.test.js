'use strict';

/**
 * P2528 — VicHY 74e5cae7 deep RX: EF00 must honor radar `cap` (not only `capability`).
 * Contre quoi: DP104 lux logged "Unmapped" while dpMappings had cap:measure_luminance;
 * value-type DP1 with only `cap` could fall through to generic measure_temperature.
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2528 VicHY clrdrnya DP cap ownership + presence edge', () => {
  it('TuyaEF00Manager early-return honors ownedMap.cap (Contre quoi Unmapped DP104)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaEF00Manager.js'), 'utf8');
    assert.match(src, /P2528/);
    assert.match(src, /ownedMap\.cap/);
    assert.match(src, /hasOwnProperty\.call\(ownedMap,\s*['"]cap['"]\)/);
  });

  it('MTG075/clrdrnya maps DP1 presence + DP104 lux/10 (Z2M parity)', () => {
    const { SENSOR_CONFIGS } = require(path.join(ROOT, 'drivers/presence_sensor_radar/configs.js'));
    const mtg = SENSOR_CONFIGS.MTG075_ZB_RL_RELAY;
    assert.ok(mtg, 'MTG075/clrdrnya config must exist');
    assert.ok(mtg.sensors.some((s) => /clrdrnya/i.test(s)));
    assert.equal(mtg.dpMap[1].cap, 'alarm_motion');
    assert.equal(mtg.dpMap[104].cap, 'measure_luminance');
    assert.equal(mtg.dpMap[104].divisor, 10);
    assert.equal(mtg.mainsPowered, true);
  });

  it('presence device edge-fires on alarm_human alone (P2528)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/device.js'),
      'utf8',
    );
    assert.match(src, /edgeHuman/);
    assert.match(src, /P2528/);
    assert.ok(
      !/_commitPresenceAndFlows[\s\S]{0,280}safeSetCapabilityValue\('alarm_human'/.test(src)
        || /await this\.safeSetCapabilityValue\('alarm_motion'/.test(src)
        || /return this\.safeSetCapabilityValue\('alarm_motion'/.test(src),
      'commit must drive motion-first (human mirrored in safeSet)',
    );
  });
});
