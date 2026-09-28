'use strict';

/**
 * P2758 — Johan transpose collisions (multi-pid / OEM / wrong-driver mfr)
 *
 * Contre quoi:
 * - `_TZE200_pay2byax` on IAS `contact_sensor` (no TS0601) steals EF00 couple from
 *   `contact_sensor_zigbee` (sacred P2201 / P126)
 * - `_TZE284_6ycgarab`+TS0601 on `presence_sensor_radar` steals smoke+CO from
 *   `smoke_sensor` (Johan #1487)
 * Dual-app: BOTH
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function compose(id) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}

describe('P2758 Johan couple collision locks', () => {
  it('pay2byax stays on contact_sensor_zigbee+TS0601 only (not IAS contact_sensor)', () => {
    const zig = compose('contact_sensor_zigbee');
    assert.ok(zig.zigbee.productId.includes('TS0601'));
    assert.ok(zig.zigbee.manufacturerName.some((m) => /pay2byax/i.test(m)));
    const ias = compose('contact_sensor');
    assert.ok(!ias.zigbee.manufacturerName.some((m) => /pay2byax/i.test(m)),
      'pay2byax must not sit on contact_sensor without TS0601 couple');
  });

  it('6ycgarab+TS0601 stays smoke_sensor (not presence_sensor_radar)', () => {
    const smoke = compose('smoke_sensor');
    assert.ok(smoke.zigbee.productId.includes('TS0601'));
    assert.ok(smoke.zigbee.manufacturerName.some((m) => /6ycgarab/i.test(m)));
    const radar = compose('presence_sensor_radar');
    assert.ok(!radar.zigbee.manufacturerName.some((m) => /6ycgarab/i.test(m)),
      '6ycgarab must not collide onto radar');
  });

  it('UnifiedSensorBase / BatteryV3 refuse sleepy PowerCfg polls', () => {
    const usb = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedSensorBase.js'), 'utf8');
    assert.match(usb, /P2757 skip _readBatteryWithFallback/);
    const v3 = fs.readFileSync(path.join(ROOT, 'lib/battery/BatteryManagerV3.js'), 'utf8');
    assert.match(v3, /P2757 refuse startPolling/);
    assert.match(v3, /P2757 sleepy\/coin — listen-only/);
  });
});
