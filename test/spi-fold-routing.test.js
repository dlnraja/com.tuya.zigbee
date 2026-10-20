'use strict';
// SPI fold (c5def1c840, 10/10/2026): led_controller_rgb (published) serves Gledopto GL-SPI-206P couples with the SPI
// device class; every other RGB device keeps the default class. Case variants are normalized by lowercase match.
const assert = require('assert');
const Module = require('module');
const path = require('path');
const root = path.join(__dirname, '..');

const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (req === 'homey-zigbeedriver') return { ZigBeeDriver: class {} };
  return origLoad.call(this, req, ...rest);
};
const Driver = require(path.join(root, 'drivers/led_controller_rgb/driver.js'));
function mapped(mfr) {
  const d = Object.create(Driver.prototype);
  const orig = Module.prototype.require;
  Module.prototype.require = function (id) { return id; };
  try { return d.onMapDeviceClass({ getSetting: () => mfr }); } finally { Module.prototype.require = orig;}
}

describe('SPI fold routing in led_controller_rgb', () => {
  after(() => { Module._load = origLoad; });
  const rgb = require(path.join(root, 'drivers/led_controller_rgb/driver.compose.json'));
  it('every SPI couple (all case variants) is on led_controller_rgb and maps to the SPI class', () => {
    const spi = rgb.zigbee.manufacturerName.filter((m) => /8fffc3kb|gt5al3bl/i.test(m));
    assert.strictEqual(spi.length, 12);
    assert.ok(rgb.zigbee.productId.includes('TS0601'));
    for (const m of spi) assert.match(String(mapped(m)), /LedControllerSpiTuyaDevice/);
  });
  it('non-SPI RGB devices keep the default class', () => {
    for (const m of ['_TZ3000_iystcadi', '_TZE284_bjoccxbi', '']) assert.strictEqual(mapped(m), './device');
  });
  it('colour temperature and light mode are in the manifest; SPI class guards them per device', () => {
    assert.ok(rgb.capabilities.includes('light_temperature') && rgb.capabilities.includes('light_mode'));
    const src = require('fs').readFileSync(path.join(root, 'lib/devices/LedControllerSpiTuyaDevice.js'), 'utf8');
    assert.match(src, /if \(has\('light_temperature'\)\)/);
    assert.match(src, /if \(has\('light_mode'\)\)/);
  });
});
