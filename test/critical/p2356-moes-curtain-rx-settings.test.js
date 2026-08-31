'use strict';

/**
 * P2356 — Moes ZTS-EUR-C (_TZE204_5slehgeo+TS0601) RX + settings (#533 salvagr)
 */
const assert = require('assert');
const { describe, it } = require('node:test');
const path = require('path');

describe('P2356 Moes curtain RX + settings', () => {
  it('device.js routes _handleTuyaDP through _handleDP', () => {
    const src = require('fs').readFileSync(
      path.join(__dirname, '../../drivers/curtain_motor/device.js'),
      'utf8',
    );
    assert.match(src, /this\._handleDP\(dp, rawBuf \?\? value\)/);
    assert.match(src, /_applyMoesZtsSettings/);
    assert.match(src, /moes_backlight/);
    assert.match(src, /removeCapability\('button\.1'\)/);
  });

  it('compose exposes Moes DP settings 3/7/8/10', () => {
    const compose = require('../../drivers/curtain_motor/driver.compose.json');
    const ids = (compose.settings || []).map((s) => s.id);
    assert.ok(ids.includes('moes_backlight'), 'DP7 setting');
    assert.ok(ids.includes('moes_motor_direction'), 'DP8 setting');
    assert.ok(ids.includes('moes_calibration_seconds'), 'DP10 setting');
    assert.ok(ids.includes('moes_calibration_mode'), 'DP3 setting');
  });
});
