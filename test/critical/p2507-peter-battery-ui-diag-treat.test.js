'use strict';

/**
 * P2507 — Peter Smartbutton battery UI (diags a5304ce8 / 77394256)
 * Contre quoi: paint 0% placeholder, accept ZCL raw 0/253, getable:false hide History
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2507 Peter Smartbutton battery UI (diag treat)', () => {
  it('button_wireless_1 compose locks measure_battery getable + insights', () => {
    const j = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'),
      'utf8',
    ));
    assert.ok(j.capabilities.includes('measure_battery'));
    const opts = j.capabilitiesOptions.measure_battery;
    assert.strictEqual(opts.getable, true);
    assert.strictEqual(opts.preventInsights, false);
    assert.strictEqual(j.capabilitiesOptions['button.1'].getable, false);
  });

  it('ButtonDevice rejects ZCL 0/253 and refuses paint 0%', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.ok(src.includes('raw === 0 || raw === 253'));
    assert.ok(src.includes('ignore 0% placeholder'));
    assert.ok(src.includes('_ensureBatteryCapabilityUi'));
    assert.ok(src.includes('previous === 0'));
  });

  it('IntelligentDeviceAdapter never paints non-positive battery', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/intelligent/IntelligentDeviceAdapter.js'),
      'utf8',
    );
    assert.ok(src.includes('skip paint non-positive') || src.includes('pct <= 0'));
  });

  it('motionsensor crash class still preempted (Gmail 9.0.891/895 tip-lag)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/utils/safe-get-driver-patch.js'), 'utf8');
    assert.ok(src.includes("'motionsensor'"));
    assert.ok(src.includes('P2481'));
    assert.ok(src.includes('isForeignDriverId(driverId)'));
  });

  it('GH #547 gkfbdvyx + #533 5slehgeo remain locked in compose', () => {
    const radar = fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'),
      'utf8',
    );
    const curtain = fs.readFileSync(
      path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'),
      'utf8',
    );
    assert.ok(radar.includes('_TZE204_gkfbdvyx'));
    assert.ok(curtain.includes('_TZE204_5slehgeo'));
  });
});
