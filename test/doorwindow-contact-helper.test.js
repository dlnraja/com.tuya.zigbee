'use strict';

/**
 * Tests — DoorWindowContactHelper + lux calibration (P92.123)
 */

const assert = require('assert');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const { setupDoorWindowSensor, handleDoorWindowSettings, INVERT_SETTING } = require('../lib/devices/DoorWindowContactHelper');

function makeDevice(settingValue = false) {
  const caps = { alarm_contact: null, alarm_tamper: null, alarm_battery: null };
  const logs = [];
  return {
    caps,
    logs,
    settings: { invert_contact: settingValue },
    log(m) { logs.push(String(m)); },
    getSetting(k) { return this.settings[k]; },
    hasCapability(c) { return c in caps; },
    setCapabilityValue(c, v) { caps[c] = v; return Promise.resolve(); },
    safeSetCapabilityValue(c, v) { caps[c] = v; return Promise.resolve(); },
    getStoreValue() { return undefined; },
    setStoreValue() { return Promise.resolve(); },
    getData() { return { id: 'test' }; },
    homey: { setTimeout: (fn) => { fn(); return 0; } },
  };
}

function makeZcl(zoneStatus) {
  const listeners = {};
  return {
    endpoints: {
      1: {
        clusters: {
          iasZone: {
            readAttributes: async () => ({ zoneStatus }),
            on(evt, fn) { listeners[evt] = fn; },
          },
        },
      },
    },
  };
}

describe('DoorWindowContactHelper', () => {
  it('applies initial zoneStatus at boot (bitset form)', async () => {
    const device = makeDevice();
    await setupDoorWindowSensor(device, makeZcl({ alarm1: true, battery: false, tamper: false }));
    assert.strictEqual(device.caps.alarm_contact, true);
  });

  it('applies initial zoneStatus at boot (numeric form)', async () => {
    const device = makeDevice();
    await setupDoorWindowSensor(device, makeZcl(0x01));
    assert.strictEqual(device.caps.alarm_contact, true);
    const device2 = makeDevice();
    await setupDoorWindowSensor(device2, makeZcl(0x00));
    assert.strictEqual(device2.caps.alarm_contact, false);
  });

  it('invert_contact flips the reported state', async () => {
    const device = makeDevice(true);
    await setupDoorWindowSensor(device, makeZcl({ alarm1: true }));
    assert.strictEqual(device.caps.alarm_contact, false, 'inverted');
  });

  it('sets tamper only when the driver opts in', async () => {
    const device = makeDevice();
    await setupDoorWindowSensor(device, makeZcl({ alarm1: false, tamper: true }), { hasTamper: true });
    assert.strictEqual(device.caps.alarm_tamper, true);
    const bare = makeDevice();
    delete bare.caps.alarm_tamper;
    await setupDoorWindowSensor(bare, makeZcl({ alarm1: false, tamper: true }), { hasTamper: false });
    assert.strictEqual(bare.caps.alarm_tamper, undefined);
  });

  it('re-applies instantly when the invert setting changes', async () => {
    const device = makeDevice(false);
    await setupDoorWindowSensor(device, makeZcl({ alarm1: true }));
    assert.strictEqual(device.caps.alarm_contact, true);
    device.settings.invert_contact = true;
    handleDoorWindowSettings(device, ['invert_contact']);
    assert.strictEqual(device.caps.alarm_contact, false, 'flipped without waiting for a physical event');
  });

  it('handles a missing IAS cluster gracefully', async () => {
    const device = makeDevice();
    await setupDoorWindowSensor(device, { endpoints: { 1: { clusters: {} } } });
    assert.ok(device.logs.some((l) => l.includes('no IAS zone cluster')));
  });

  it('exposes a valid invert setting definition', () => {
    assert.strictEqual(INVERT_SETTING.id, 'invert_contact');
    assert.strictEqual(INVERT_SETTING.type, 'checkbox');
    assert.strictEqual(INVERT_SETTING.value, false);
  });
});
