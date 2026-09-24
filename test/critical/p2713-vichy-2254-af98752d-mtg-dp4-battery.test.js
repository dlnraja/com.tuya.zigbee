'use strict';

/**
 * P2713 — VicHY #2254 diag af98752d: frozen presence + phantom battery
 *
 * Contre quoi:
 * - Generic EF00 fallback maps DP4→measure_battery on MTG075 (DP4=detection_range)
 * - Generic maps DP103→measure_luminance (MTG lux=DP104; DP103=cline) → null lux
 * - Presence radar detection must not require driver.id (empty early boot)
 * Dual-app: BOTH reliability — master-first this session
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const MGR = path.join(ROOT, 'lib/tuya/TuyaEF00Manager.js');
const CFG = path.join(ROOT, 'drivers/presence_sensor_radar/configs.js');

describe('P2713 VicHY #2254 af98752d MTG DP4/DP103 generic skip', () => {
  it('TuyaEF00Manager skips generic DP4/DP103 on presence radar', () => {
    const src = fs.readFileSync(MGR, 'utf8');
    assert.ok(src.includes('P2713'));
    assert.ok(src.includes('af98752d') || src.includes('#2254'));
    assert.match(src, /isPresenceRadarDriver && \(Number\(dp\) === 4 \|\| Number\(dp\) === 103\)/);
    assert.match(src, /4:\s*isPresenceRadarDriver\s*\?\s*null\s*:\s*'measure_battery'/);
    assert.match(src, /103:\s*isPresenceRadarDriver\s*\?\s*null\s*:\s*'measure_luminance'/);
  });

  it('MTG075 clrdrnya dpMap: DP4 setting detection_range, lux on DP104 not 103', () => {
    const { SENSOR_CONFIGS } = require(CFG);
    const cfg = SENSOR_CONFIGS.MTG075_ZB_RL_RELAY;
    assert.ok(cfg.sensors.some((s) => /clrdrnya/i.test(s)));
    assert.equal(cfg.dpMap[4].setting, 'detection_range');
    assert.equal(cfg.dpMap[4].cap, null);
    assert.equal(cfg.dpMap[104].cap, 'measure_luminance');
    assert.ok(cfg.dpMap[103].cap == null);
    assert.ok(cfg.mainsPowered === true);
    assert.ok(cfg.noBatteryCapability === true);
  });

  it('npm check:p2713 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts && pkg.scripts['check:p2713']);
  });
});
