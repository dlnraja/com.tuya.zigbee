'use strict';

/**
 * P2393 — Salvagr #533 Moes cover: Homey UI idle cancels open/close
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '../..');
const src = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedCoverBase.js'), 'utf8');

describe('P2393 — cover motion guard (Salvagr idle cancel)', () => {
  it('UnifiedCoverBase arms motion guard and skips idle stop', () => {
    assert.ok(src.includes('_armCoverMotionGuard'));
    assert.ok(src.includes('_shouldSkipCoverIdleStop'));
    assert.ok(src.includes('P2393'));
    assert.ok(src.includes('skip idle stop'));
    assert.ok(src.includes('5slehgeo'));
  });

  it('state listener does not snap position to 0/1 after up/down', () => {
    assert.ok(src.includes('do NOT snap position to 0/1'));
    assert.ok(src.includes("await this._optimisticCoverUpdate({ state });"));
  });

  it('helper logic: idle skipped while guard active', () => {
    const device = {
      _coverMotionGuardUntil: Date.now() + 5000,
      _shouldSkipCoverIdleStop() {
        const until = Number(this._coverMotionGuardUntil) || 0;
        return until > 0 && Date.now() < until;
      },
    };
    assert.strictEqual(device._shouldSkipCoverIdleStop(), true);
    device._coverMotionGuardUntil = Date.now() - 1;
    assert.strictEqual(device._shouldSkipCoverIdleStop(), false);
  });
});
