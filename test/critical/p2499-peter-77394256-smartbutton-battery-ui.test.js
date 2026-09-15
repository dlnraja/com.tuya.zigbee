'use strict';

/**
 * P2499 — Peter #2238 diag 77394256 @ 9.0.926 Smartbutton
 * Contre quoi: measure_battery getable:false hides Battery + History in Homey UI
 * even when ZCL reports %; getParser null→0 paints fake 0%.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2499 Peter 77394256 Smartbutton battery UI getable', () => {
  it('button_wireless_1 measure_battery must stay getable (Homey UI + History)', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers', 'button_wireless_1', 'driver.compose.json'),
      'utf8',
    ));
    assert.ok(compose.capabilities.includes('measure_battery'));
    const opts = compose.capabilitiesOptions?.measure_battery || {};
    assert.notEqual(opts.getable, false, 'getable:false hides battery tile / History');
  });

  it('device.js heals getable + rehydrates measure_battery (P2490/P2499)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers', 'button_wireless_1', 'device.js'),
      'utf8',
    );
    assert.ok(src.includes('P2499'));
    assert.ok(src.includes('getable'));
    assert.ok(src.includes('P2490 rehydrate measure_battery'));
  });

  it('button registerCapability getParser must not coerce null→0', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib', 'devices', 'BaseUnifiedDevice.js'),
      'utf8',
    );
    const idx = src.indexOf('Registering measure_battery for button');
    assert.ok(idx > 0);
    const slice = src.slice(idx, idx + 4500);
    assert.ok(
      slice.includes('getParser: value => BaseUnifiedDevice._safeBatteryPercent(value, this)'),
      'button getParser must pass device + not use ?? 0',
    );
    assert.ok(!slice.includes('_safeBatteryPercent(value) ?? 0'));
  });
});
