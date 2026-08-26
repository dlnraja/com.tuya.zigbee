'use strict';

/**
 * P2279 — cover + USB sacred-couple gate
 */
const assert = require('assert');
const { describe, it } = require('node:test');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');

describe('P2279 1fuxihti + mvtclclq', () => {
  it('1fuxihti on curtain_motor not climate', () => {
    const climate = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'climate_sensor', 'driver.compose.json'), 'utf8'));
    assert.ok(!(climate.zigbee.manufacturerName || []).some((m) => /1fuxihti/i.test(m)));
    const curtain = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'curtain_motor', 'driver.compose.json'), 'utf8'));
    assert.ok((curtain.zigbee.manufacturerName || []).some((m) => /_TZE284_1fuxihti/i.test(m)));
    assert.ok((curtain.zigbee.manufacturerName || []).some((m) => /_TZE200_1fuxihti/i.test(m)));
  });

  it('mvtclclq on usb_outlet_advanced not wall_dimmer', () => {
    const dimmer = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'wall_dimmer_tuya', 'driver.compose.json'), 'utf8'));
    assert.ok(!(dimmer.zigbee.manufacturerName || []).some((m) => /mvtclclq/i.test(m)));
    const usb = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'usb_outlet_advanced', 'driver.compose.json'), 'utf8'));
    assert.ok((usb.zigbee.manufacturerName || []).some((m) => /mvtclclq/i.test(m)));
    const src = fs.readFileSync(path.join(ROOT, 'drivers', 'usb_outlet_advanced', 'device.js'), 'utf8');
    assert.ok(src.includes('mvtclclq'));
    assert.ok(src.includes("capability: 'onoff.usb1'"));
  });
});
