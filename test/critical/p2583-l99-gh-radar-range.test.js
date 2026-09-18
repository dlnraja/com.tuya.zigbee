'use strict';

/**
 * P2583 — L99 treat GH #533/#547/#548 + gkfbdvyx dual-scale range
 *
 * Contre quoi:
 * - gkfbdvyx DP3/4 blind /100 breaks ZHA×0.1 firmwares
 * - TZE284_gkfbdvyx dropped from sacred-keep
 * - ZY_M100 stays needsPolling:false forever (silent RX / left mesh)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2583 L99 GH radar/curtain + range scale', () => {
  it('normalizeRadarRangeMeters dual-scale (Z2M cm + ZHA dm)', () => {
    const { normalizeRadarRangeMeters, toRadarRangeTuyaValue } = require('../../lib/tuya/TuyaRadarRangeScale');
    assert.strictEqual(normalizeRadarRangeMeters(600), 6); // cm
    assert.strictEqual(normalizeRadarRangeMeters(60), 6); // dm
    assert.strictEqual(normalizeRadarRangeMeters(6), 6); // already meters
    assert.strictEqual(toRadarRangeTuyaValue(6), 600);
  });

  it('ZY_M100_CEILING_24G uses radarRangeScale + soft polling', () => {
    const { getSensorConfig } = require('../../drivers/presence_sensor_radar/configs');
    const cfg = getSensorConfig('_TZE204_gkfbdvyx', 'TS0601');
    assert.ok(cfg);
    assert.strictEqual(cfg.needsPolling, true);
    assert.ok(cfg.pollIntervalMs >= 60000);
    assert.strictEqual(cfg.dpMap[3].radarRangeScale, true);
    assert.strictEqual(cfg.dpMap[4].radarRangeScale, true);
  });

  it('sacred-keep pins gkfbdvyx TZE284 + 5slehgeo curtain', () => {
    const keep = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8'));
    const couples = keep.couples || [];
    assert.ok(couples.some((c) => /gkfbdvyx/i.test(c.mfr) && c.mfr.includes('284')
      && c.driverId === 'presence_sensor_radar'));
    assert.ok(couples.some((c) => /5slehgeo/i.test(c.mfr) && c.driverId === 'curtain_motor'));
  });

  it('device wires radarRangeScale convert path', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.ok(src.includes('radarRangeScale'));
    assert.ok(src.includes('TuyaRadarRangeScale'));
    assert.ok(src.includes('_radarMagicRetryScheduled'));
  });
});
