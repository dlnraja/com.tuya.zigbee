'use strict';

/**
 * P2712 — VicHY #2255 Advanced Flows lag / presence cards reload
 *
 * Contre quoi:
 * - periodic phantom heal every 60s always mutates caps/energy → Flow UI storm
 * - _healRadarPhantomCaps re-arms tile sanitize burst on clean ticks forever
 * - arm flag cleared at 150s while bursts ran to 600s → re-arm loop
 * Dual-app: BOTH (reliability) — shipped master-first this session
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DEVICE = path.join(ROOT, 'drivers/presence_sensor_radar/device.js');

describe('P2712 VicHY Advanced Flows lag — dirty heal only', () => {
  it('periodic phantom heal interval is 10 min (not 60s)', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('P2712'));
    // Contre quoi: 60_000 interval on safeSetInterval for phantom heal
    const intervalBlock = src.slice(
      src.indexOf('_scheduleRadarPhantomReheal'),
      src.indexOf('_clearRadarPhantomHealInterval'),
    );
    assert.match(intervalBlock, /safeSetInterval\([\s\S]*?,\s*600_000\s*\)/);
    assert.ok(!/safeSetInterval\([\s\S]*?,\s*60_000\s*\)/.test(intervalBlock));
  });

  it('_healRadarPhantomCaps dirty-checks before removeCapability/setEnergy', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    const start = src.indexOf('async _healRadarPhantomCaps()');
    const end = src.indexOf('\n  _armMtgTileSanitizeBurst()');
    assert.ok(start > 0 && end > start);
    const heal = src.slice(start, end);
    assert.ok(heal.includes('Advanced Flows'));
    assert.ok(heal.includes('let dirty = false'));
    assert.ok(heal.includes('return { dirty: false'));
    assert.ok(/if \(removedAny \|\| flippedFromCurtain\)/.test(heal));
  });

  it('tile sanitize arm window covers full burst (no early 150s clear)', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    const start = src.indexOf('\n  _armMtgTileSanitizeBurst()');
    const end = src.indexOf('\n  async _ensureDistanceUnitsString');
    assert.ok(start > 0 && end > start);
    const arm = src.slice(start, end);
    assert.ok(arm.includes('armMs'));
    assert.ok(!/150_000/.test(arm));
    assert.ok(!/, 600_000\]/.test(arm) && !/600_000,/.test(arm.replace(/armMs[\s\S]*/, '')), 'ceiling max burst trimmed');
  });

  it('npm check:p2712 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts && pkg.scripts['check:p2712']);
  });
});
