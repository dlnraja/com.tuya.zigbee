'use strict';
// P3063b: the Wi-Fi cover travel estimator must write the estimated position through
// safeSetCapabilityValue (TITAN pattern gate), never through raw setCapabilityValue.
const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');

function loadDeviceClass(rel) {
  const orig = Module._load;
  class Base { }
  Module._load = function load(r, ...a) {
    if (r === 'homey') {return new Proxy({}, { get: (_t, k) => k === '__esModule' ? false : Base });}
    return orig.call(this, r, ...a);
  };
  try { return require(rel); } finally { Module._load = orig; }
}

test('idle travel estimate goes through safeSetCapabilityValue', () => {
  const Cls = loadDeviceClass('../../drivers/wifi_cover/device.js');
  const dev = Object.create(Cls.prototype);
  const safe = [];
  dev._travel = () => ({ onState: () => 0.4567 });
  dev._clearTravelTimer = () => {};
  dev.setStoreValue = async () => {};
  dev.safeSetCapabilityValue = async (c, v) => { safe.push([c, v]); };
  dev.setCapabilityValue = async () => { throw new Error('raw setCapabilityValue used'); };
  dev._travelOnState('idle');
  assert.deepStrictEqual(safe, [['windowcoverings_set', 0.46]]);
});

test('moving state does not write the capability', () => {
  const Cls = loadDeviceClass('../../drivers/wifi_cover/device.js');
  const dev = Object.create(Cls.prototype);
  let n = 0;
  dev._travel = () => ({ onState: () => 0.2 });
  dev._clearTravelTimer = () => {};
  dev.setStoreValue = async () => {};
  dev.safeSetCapabilityValue = async () => { n++; };
  dev._travelOnState('opening');
  assert.strictEqual(n, 0);
});
