'use strict';

/**
 * P2824 — Forum subjects + flow harden Contre quoi
 * - Registry p189 USB wall outlet → usb_outlet_advanced (not stale switch_usb_dongle)
 * - Istvan #2262 gnpflcoq 4in1: climate caps on motion_sensor_radar_mmwave
 * - P2823 LCD 9ern still on lcdtemphumidsensor
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function compose(id) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}

function hasMfr(id, needle) {
  const n = String(needle).toLowerCase();
  return (compose(id).zigbee?.manufacturerName || []).some((m) => String(m).toLowerCase() === n);
}

describe('P2824 forum flows + gnpflcoq + usb registry', () => {
  it('p189 3zofvcaa canonicalDriver is usb_outlet_advanced', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const e = (reg.cases || []).find((c) => c.id === 'p189-usb-wall-outlet-not-climate');
    assert.ok(e);
    assert.equal(e.canonicalDriver, 'usb_outlet_advanced');
    assert.equal(hasMfr('usb_outlet_advanced', '_TZ3000_3zofvcaa'), true);
  });

  it('gnpflcoq+TS0601 4in1 has temp/humidity/battery caps (#2262)', () => {
    const c = compose('motion_sensor_radar_mmwave');
    assert.equal(hasMfr('motion_sensor_radar_mmwave', '_TZE284_gnpflcoq'), true);
    for (const cap of ['alarm_motion', 'measure_luminance', 'measure_temperature', 'measure_humidity', 'measure_battery']) {
      assert.ok(c.capabilities.includes(cap), `missing ${cap}`);
    }
    assert.ok((c.energy?.batteries || []).length > 0, 'battery energy required for 4in1');
  });

  it('9ern5sfh stays on lcdtemphumidsensor (P2823)', () => {
    assert.equal(hasMfr('lcdtemphumidsensor', '_TZE284_9ern5sfh'), true);
    assert.equal(hasMfr('climate_sensor', '_TZE284_9ern5sfh'), false);
  });

  it('DeclaredFlowCardAutoWire still wires scene_recall / brightness_changed', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/flow/DeclaredFlowCardAutoWire.js'), 'utf8');
    assert.ok(/RE_SCENE_RECALL/.test(src));
    assert.ok(/RE_BRIGHTNESS_CHANGED/.test(src));
    assert.ok(/getDeviceTriggerCard\(id\)/.test(src));
    assert.ok(!/getDeviceTriggerCard\([^)]+,\s*['\"]trigger['\"]\)/.test(src));
  });
});
