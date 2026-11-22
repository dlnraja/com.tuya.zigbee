'use strict';

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const {
  shouldRejectSiblingCrosstalk,
  recordAccepted,
  reset,
} = require('../../lib/tuya/SiblingCrosstalkGuard');

function makeFleet() {
  const caps = {
    basement: { measure_temperature: 9, measure_humidity: 46.5 },
    roomA: { measure_temperature: 22, measure_humidity: 40.5 },
    roomB: { measure_temperature: 25.9, measure_humidity: 30.4 },
  };
  const devices = {};
  const driver = {
    getDevices() { return [devices.basement, devices.roomA, devices.roomB]; },
  };
  for (const [id, values] of Object.entries(caps)) {
    const device = {
      id,
      driver,
      getData() { return { id, ieeeAddress: `ieee-${id}` }; },
      getCapabilityValue(cap) { return values[cap]; },
      setCap(cap, v) { values[cap] = v; },
    };
    devices[id] = device;
    recordAccepted(device, 'measure_temperature', values.measure_temperature);
    recordAccepted(device, 'measure_humidity', values.measure_humidity);
  }
  return devices;
}

describe('P3396 lcdtemphumidsensor_3 sibling crosstalk guard (diag ec7026a7)', () => {
  it('drops a room jump to the basement temperature while the LCD would stay at 22', () => {
    const d = makeFleet();
    assert.strictEqual(
      shouldRejectSiblingCrosstalk(d.roomA, 'measure_temperature', 9),
      true
    );
  });

  it('accepts the basement reporting its own 9 C', () => {
    const d = makeFleet();
    assert.strictEqual(
      shouldRejectSiblingCrosstalk(d.basement, 'measure_temperature', 9),
      false
    );
  });

  it('accepts a gradual room change that does not match a sibling', () => {
    const d = makeFleet();
    assert.strictEqual(
      shouldRejectSiblingCrosstalk(d.roomA, 'measure_temperature', 21.6),
      false
    );
  });

  it('accepts a real large jump that no sibling currently shows', () => {
    const d = makeFleet();
    assert.strictEqual(
      shouldRejectSiblingCrosstalk(d.roomA, 'measure_temperature', 12),
      false
    );
  });

  it('accepts the first sample when the device has no last value', () => {
    const d = makeFleet();
    reset(d.roomA);
    d.roomA.getCapabilityValue = () => undefined;
    assert.strictEqual(
      shouldRejectSiblingCrosstalk(d.roomA, 'measure_temperature', 9),
      false
    );
  });

  it('drops a humidity jump that copies a sibling', () => {
    const d = makeFleet();
    assert.strictEqual(
      shouldRejectSiblingCrosstalk(d.roomB, 'measure_humidity', 46.5),
      true
    );
  });

  it('processResponse of lcdtemphumidsensor_3 calls the guard before writing', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../drivers/lcdtemphumidsensor_3/device.js'),
      'utf8'
    );
    assert.match(src, /SiblingCrosstalkGuard/);
    assert.match(src, /shouldRejectSiblingCrosstalk/);
    assert.match(src, /recordAccepted/);
  });
});
