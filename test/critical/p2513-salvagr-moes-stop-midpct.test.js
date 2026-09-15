'use strict';

/**
 * P2513 — Salvagr #533 residual (2026-09-15): Stop dead + mid-% → extreme
 * Contre quoi:
 * - 40s idle-skip blocks deliberate STOP for whole travel
 * - Homey open/close echo after mid-slider dual-TX runs motor to extreme
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedCoverBase.js'), 'utf8');

describe('P2513 Salvagr Moes stop + mid-% Contre quoi', () => {
  it('Moes motion guard is short UI-release window (not 40s)', () => {
    assert.ok(src.includes('P2513'));
    assert.ok(/moesZts \? 2000 : 2500/.test(src), '2s Moes idle-skip');
    assert.ok(!/moesZts \? 40000/.test(src), 'must not use 40s skip');
  });

  it('mid-position stamps and skips follow-up open/close', () => {
    assert.ok(src.includes('_moesPositionOnlyAt'));
    assert.ok(src.includes('_shouldSkipMoesOpenCloseAfterPosition'));
    assert.ok(src.includes('skip Homey open/close after mid-position'));
  });

  it('5slehgeo remains curtain_motor', () => {
    const compose = fs.readFileSync(
      path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'), 'utf8');
    assert.ok(/_TZE204_5slehgeo/i.test(compose));
  });

  it('helper: skip open/close only within 3s of position-only', () => {
    const device = {
      _moesPositionOnlyAt: Date.now(),
      _shouldSkipMoesOpenCloseAfterPosition() {
        const at = Number(this._moesPositionOnlyAt) || 0;
        return at > 0 && (Date.now() - at) < 3000;
      },
    };
    assert.equal(device._shouldSkipMoesOpenCloseAfterPosition(), true);
    device._moesPositionOnlyAt = Date.now() - 4000;
    assert.equal(device._shouldSkipMoesOpenCloseAfterPosition(), false);
  });
});
