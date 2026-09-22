'use strict';

/**
 * P2672 — IntelligentEnergyAdapter Contre quoi
 * Fail if HOBEIAN lighting is treated as metered, or plugs lose metered mode,
 * or approximation+meter are applied together, or SSOT drops the adapter.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  resolveProfile,
  ENERGY_POWER_CAPS,
} = require(path.join(ROOT, 'lib', 'energy', 'IntelligentEnergyAdapter'));

function mockDevice({ driverId, cls, mfr, pid, mainsPowered, clusters = {} }) {
  return {
    driver: { id: driverId },
    mainsPowered,
    getClass: () => cls,
    getSetting: (k) => {
      if (k === 'zb_manufacturer_name') return mfr;
      if (k === 'zb_model_id') return pid;
      return null;
    },
    getStoreValue: () => null,
    zclNode: { endpoints: { 1: { clusters } } },
    hasCapability: () => false,
    getEnergy: () => ({}),
  };
}

describe('P2672 IntelligentEnergyAdapter', () => {
  it('HOBEIAN ZG-301Z → approximate (strip power, skip ZCL bind)', () => {
    const p = resolveProfile(mockDevice({
      driverId: 'switch_1gang',
      cls: 'light',
      mfr: 'HOBEIAN',
      pid: 'ZG-301Z',
      mainsPowered: true,
    }));
    assert.equal(p.mode, 'approximate');
    assert.ok(p.stripPowerCaps);
    assert.ok(p.skipZclEnergyBind);
    assert.ok(p.setEnergy?.approximation);
    assert.equal(p.mainsPowered, true);
  });

  it('plug with electricalMeasurement → metered', () => {
    const p = resolveProfile(mockDevice({
      driverId: 'plug_energy_monitor',
      cls: 'socket',
      mfr: '_TZ3000_abc',
      pid: 'TS011F',
      mainsPowered: true,
      clusters: { electricalMeasurement: {} },
    }));
    assert.equal(p.mode, 'metered');
    assert.equal(p.stripPowerCaps, false);
    assert.equal(p.skipZclEnergyBind, false);
  });

  it('climate_sensor → battery profile', () => {
    const p = resolveProfile(mockDevice({
      driverId: 'climate_sensor',
      cls: 'sensor',
      mfr: 'HOBEIAN',
      pid: 'ZG-227Z',
      mainsPowered: false,
    }));
    assert.equal(p.mode, 'battery');
    assert.ok(p.stripPowerCaps);
    assert.ok(Array.isArray(p.setEnergy?.batteries));
  });

  it('mains presence radar → mains_sensor (no battery phantoms)', () => {
    const p = resolveProfile(mockDevice({
      driverId: 'presence_sensor_radar',
      cls: 'sensor',
      mfr: '_TZE204_clrdrnya',
      pid: 'TS0601',
      mainsPowered: true,
    }));
    assert.equal(p.mode, 'mains_sensor');
    assert.ok(p.stripBatteryCaps);
    assert.equal(p.mainsPowered, true);
  });

  it('SmartEnergyManager boots adapter before UniversalEnergyHandler', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'managers', 'SmartEnergyManager.js'), 'utf8');
    assert.ok(src.includes('IntelligentEnergyAdapter'));
    assert.ok(src.includes('skipZclEnergyBind'));
    const adapterIdx = src.indexOf('IntelligentEnergyAdapter');
    const uehIdx = src.indexOf('new UniversalEnergyHandler');
    assert.ok(adapterIdx > 0 && uehIdx > adapterIdx, 'adapter before UniversalEnergyHandler');
  });

  it('DynamicEnergyManager defers to IntelligentEnergyAdapter', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'dynamic', 'DynamicEnergyManager.js'), 'utf8');
    assert.ok(src.includes('IntelligentEnergyAdapter'));
    assert.ok(src.includes('skipZclEnergyBind') || src.includes('mode !== \'metered\''));
  });

  it('wall_switch without meter clusters → approximate', () => {
    const p = resolveProfile(mockDevice({
      driverId: 'wall_switch_2gang_1way',
      cls: 'socket',
      mfr: '_TZ3000_abc',
      pid: 'TS0002',
      mainsPowered: true,
    }));
    assert.equal(p.mode, 'approximate');
    assert.ok(p.skipZclEnergyBind);
    assert.ok(p.stripPowerCaps);
    assert.ok(p.setEnergy?.approximation);
  });

  it('class socket alone does not force metered without plug driver or clusters', () => {
    const p = resolveProfile(mockDevice({
      driverId: 'switch_1gang',
      cls: 'socket',
      mfr: '_TZ3000_xyz',
      pid: 'TS0001',
      mainsPowered: true,
    }));
    assert.notEqual(p.mode, 'metered');
  });

  it('energy-compensation-ssot lists IntelligentEnergyAdapter first', () => {
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config', 'architecture', 'energy-compensation-ssot.json'), 'utf8'),
    );
    assert.equal(ssot.priority[0], 'IntelligentEnergyAdapter_profile');
    assert.ok(ssot.roles.IntelligentEnergyAdapter);
    assert.ok(ssot.modes.approximate);
    assert.ok(ssot.gates.some((g) => String(g).includes('p2672')));
  });

  it('ENERGY_POWER_CAPS covers Homey electrical set', () => {
    for (const c of ['measure_power', 'meter_power', 'measure_voltage', 'measure_current']) {
      assert.ok(ENERGY_POWER_CAPS.includes(c));
    }
  });

  it('npm check:p2672 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2672']);
  });
});
