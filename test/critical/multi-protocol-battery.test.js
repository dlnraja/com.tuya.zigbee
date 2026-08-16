'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeProtocol,
  normalizeBatteryPercent,
  ingestBatterySample,
  attachMultiProtocolBattery,
  PROTOCOL_ALIASES,
} = require('../../lib/battery/MultiProtocolBatteryPercent');

describe('P209 multi-protocol battery percent', () => {
  it('aliases wifi / zcl / dp / ias / acl / voltage', () => {
    assert.equal(normalizeProtocol('zigbee'), 'zcl');
    assert.equal(normalizeProtocol('tuya-dp'), 'tuya-dp');
    assert.equal(normalizeProtocol('dp'), 'tuya-dp');
    assert.equal(normalizeProtocol('wifi'), 'wifi');
    assert.equal(normalizeProtocol('local-wifi'), 'wifi');
    assert.equal(normalizeProtocol('acl'), 'ias');
    assert.equal(normalizeProtocol('ace'), 'ias');
    assert.equal(normalizeProtocol('millivolt'), 'voltage');
    assert.ok(PROTOCOL_ALIASES.ef00);
  });

  it('normalizes ZCL 0-200 and sentinels', () => {
    assert.equal(normalizeBatteryPercent(200, { protocol: 'zcl' }), 100);
    // Many Tuya ZCL reports are already 0–100 (handler keeps 100 as 100%)
    assert.equal(normalizeBatteryPercent(100, { protocol: 'zcl' }), 100);
    assert.equal(normalizeBatteryPercent(255, { protocol: 'zcl' }), null);
  });

  it('normalizes WiFi 0-100 and 0-200', () => {
    assert.equal(normalizeBatteryPercent(87, { protocol: 'wifi' }), 87);
    assert.equal(normalizeBatteryPercent(174, { protocol: 'wifi' }), 87);
  });

  it('IAS/acl low battery maps to 10%, healthy abstains without last', () => {
    assert.equal(normalizeBatteryPercent(true, { protocol: 'acl' }), 10);
    assert.equal(normalizeBatteryPercent(false, { protocol: 'ias' }), null);
    assert.equal(normalizeBatteryPercent(false, { protocol: 'ias', lastValue: 72 }), 72);
  });

  it('Tuya DP percent and 0-200 scale', () => {
    assert.equal(normalizeBatteryPercent(80, { protocol: 'tuya-dp', dp: 14 }), 80);
    assert.equal(normalizeBatteryPercent(160, { protocol: 'dp' }), 80);
  });

  it('ingest commits via confirmInbound when present', async () => {
    const calls = [];
    const fake = {
      _destroyed: false,
      mainsPowered: false,
      hasCapability: (c) => c === 'measure_battery',
      getCapabilityValue: () => null,
      getSetting: () => '',
      getStoreValue: () => null,
      setStoreValue: async () => {},
      confirmInbound: async (cap, value, source, conf) => {
        calls.push({ cap, value, source, conf });
        return { ok: true };
      },
    };
    attachMultiProtocolBattery(fake);
    const r = await fake.ingestBatteryPercent(200, { protocol: 'zcl' });
    assert.equal(r.ok, true);
    assert.equal(r.percent, 100);
    assert.equal(calls[0].source, 'zcl');
    assert.equal(calls[0].value, 100);
  });

  it('mains devices refuse inventing battery %', async () => {
    const r = await ingestBatterySample({
      mainsPowered: true,
      _destroyed: false,
    }, 50, { protocol: 'wifi' });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'mains');
  });
});
