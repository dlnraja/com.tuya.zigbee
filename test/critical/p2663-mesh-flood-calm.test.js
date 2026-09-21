'use strict';
/**
 * P2663 — Contre quoi: aggressive haElectricalMeasurement reporting (minInterval 10)
 * must not ship on HOBEIAN / mesh-calm path; calm configs ≥60s; heal calls mesh calm.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const calm = require(path.join(ROOT, 'lib/zigbee/MeshFloodCalm.js'));
const heal = require(path.join(ROOT, 'lib/tuya/HobeianZg301zHeal.js'));

describe('P2663 mesh flood calm', () => {
  it('calm electrical activePower minInterval >= 60 (not 10)', () => {
    const configs = calm.buildCalmElectricalReportingConfigs({ withJitter: false });
    const power = configs.find((c) => c.attributeName === 'activePower');
    assert.ok(power);
    assert.ok(power.minInterval >= 60, `expected >=60 got ${power.minInterval}`);
    assert.ok(power.maxInterval >= 900);
  });

  it('shouldSkipElectricalReporting for HOBEIAN without electrical cluster', () => {
    const device = {
      getSetting: (k) => (k === 'zb_manufacturer_name' ? 'HOBEIAN' : ''),
      getData: () => ({}),
      getStoreValue: () => null,
      zclNode: { endpoints: { 1: { clusters: { onOff: {} } } } },
    };
    assert.equal(calm.shouldSkipElectricalReporting(device), true);
  });

  it('heal invokes mesh calm (disable electrical reporting)', async () => {
    const calls = [];
    const settings = { zb_manufacturer_name: 'HOBEIAN', zb_model_id: '' };
    const device = {
      driver: { id: 'switch_1gang' },
      getSetting: (k) => settings[k] || '',
      getData: () => ({}),
      getStoreValue: () => null,
      setSettings: async (u) => { Object.assign(settings, u); },
      setStoreValue: async () => {},
      hasCapability: () => false,
      removeCapability: async () => {},
      configureAttributeReporting: async (cfgs) => { calls.push(cfgs); },
      log: () => {},
      _setGangOnOff: async () => {},
    };
    const ok = await heal.healHobeianZg301z(device, null);
    assert.equal(ok, true);
    assert.equal(device._skipElectricalReporting, true);
    assert.ok(calls.length >= 1, 'expected configureAttributeReporting to calm mesh');
    const flat = calls.flat();
    assert.ok(flat.some((c) => c.attributeName === 'activePower' && c.minInterval >= 3600));
  });

  it('switch_1gang device.js heals before electrical and uses MeshFloodCalm', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/switch_1gang/device.js'),
      'utf8',
    );
    assert.match(src, /MeshFloodCalm/);
    assert.match(src, /healHobeianZg301z/);
    assert.match(src, /buildCalmElectricalReportingConfigs/);
    assert.doesNotMatch(src, /minInterval:\s*10/);
    const onNode = src.slice(src.indexOf('async onNodeInit'));
    const healIdx = onNode.indexOf('healHobeianZg301z(this, zclNode)');
    const calmIdx = onNode.indexOf('buildCalmElectricalReportingConfigs');
    assert.ok(healIdx >= 0 && calmIdx > healIdx, 'heal must run before calm electrical configs in onNodeInit');
  });

  it('TuyaZigbeeDevice skips reconfigure when mesh-calm flag set', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'),
      'utf8',
    );
    assert.match(src, /_skipElectricalReporting/);
    assert.match(src, /P2663 skip attribute reconfigure/);
  });
});
