'use strict';

/**
 * P2512 — Peter #2233/#2234 Smartbutton battery + History (diags 8afffc76 / 1e071a86)
 *
 * Contre quoi:
 * - app.json drifts to measure_battery.getable:false → Homey hides Battery + History
 *   while compose already has getable:true + preventInsights:false
 * - boot heal only runs on ZCL ingest → sleepy never wakes → UI stays blank
 * - couple _TZ3000_mrpevh8p+TS0041 stays button_wireless_1
 *
 * Note: Homey has no separate "button press activity History" for class:button —
 * Insights History is for measure_battery once % is painted. Use Flow cards for presses.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2512 Peter Smartbutton battery History UI (8afffc76 / 1e071a86)', () => {
  it('compose + app.json measure_battery getable/insights for button_wireless_1', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'), 'utf8'));
    assert.equal(compose.capabilitiesOptions.measure_battery.getable, true);
    assert.equal(compose.capabilitiesOptions.measure_battery.preventInsights, false);

    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const d = app.drivers.find((x) => x.id === 'button_wireless_1');
    assert.ok(d, 'button_wireless_1 in app.json');
    const opts = d.capabilitiesOptions?.measure_battery || {};
    assert.equal(opts.getable, true, 'app.json must not ship getable:false (hides History)');
    assert.notEqual(opts.preventInsights, true, 'app.json must not preventInsights');
  });

  it('device.js boot calls _ensureBatteryCapabilityUi (P2512)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/device.js'), 'utf8');
    assert.ok(src.includes('_ensureBatteryCapabilityUi') || src.includes('P2512'));
    assert.ok(/mrpevh8p/.test(src));
    assert.ok(src.includes('CR2450'));
  });

  it('ButtonDevice _ensureBatteryCapabilityUi restores getable + insights', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.ok(src.includes('preventInsights: false'));
    assert.ok(src.includes('getable: true'));
    assert.ok(src.includes('_ensureBatteryCapabilityUi'));
  });

  it('mrpevh8p+TS0041 remains on button_wireless_1', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'), 'utf8'));
    const mfrs = (compose.zigbee?.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.ok(mfrs.some((m) => m.includes('mrpevh8p')));
    assert.ok(mfrs.some((m) => m.includes('5bpeda8u')), 'SH-SC07 sibling from b8b78521');
    assert.ok((compose.zigbee?.productId || []).includes('TS0041'));
  });

  // Contre quoi: do not invent a press-History tab — Homey class:button has none.
  it('documents class:button (no invent press-History capability)', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'), 'utf8'));
    assert.equal(compose.class, 'button');
    assert.ok(!compose.capabilities.some((c) => /history|insight/i.test(c)));
  });
});
