'use strict';

/**
 * P2673 — Bastien-first intelligent max benefit (Contre quoi)
 * Fail if Bastien loses IntelligentEnergyAdapter boot-first, P2672 SSOT,
 * or HOBEIAN exact case forms that Athom matching needs.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2673 Bastien intelligent max benefit', () => {
  it('app identity stays Bastien (never Universal/Stable id)', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose', 'app.json'), 'utf8'));
    assert.equal(app.id, 'com.dlnraja.tuya.zigbee.bastien');
    assert.match(String(app.version), /^1\./);
  });

  it('TuyaZigbeeDevice boots IntelligentEnergyAdapter before SmartEnergyManager', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'tuya', 'TuyaZigbeeDevice.js'), 'utf8');
    const adapterIdx = src.indexOf('IntelligentEnergyAdapter');
    const energyIdx = src.indexOf('new SmartEnergyManager');
    assert.ok(adapterIdx > 0, 'missing IntelligentEnergyAdapter');
    assert.ok(energyIdx > adapterIdx, 'adapter must run before SmartEnergyManager construct');
  });

  it('UniversalZigbeeDevice also applies IntelligentEnergyAdapter first', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'UniversalZigbeeDevice.js'), 'utf8');
    assert.ok(src.includes('IntelligentEnergyAdapter'));
    const adapterIdx = src.indexOf('IntelligentEnergyAdapter');
    const energyIdx = src.indexOf('new SmartEnergyManager');
    assert.ok(adapterIdx > 0 && energyIdx > adapterIdx);
  });

  it('energy-compensation-ssot lists IntelligentEnergyAdapter first', () => {
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config', 'architecture', 'energy-compensation-ssot.json'), 'utf8'),
    );
    assert.equal(ssot.priority[0], 'IntelligentEnergyAdapter_profile');
  });

  it('HOBEIAN switch_1gang keeps exact case forms + ZG-301Z', () => {
    const c = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers', 'switch_1gang', 'driver.compose.json'), 'utf8'),
    );
    const mfr = c.zigbee?.manufacturerName || [];
    const pid = c.zigbee?.productId || [];
    assert.ok(mfr.includes('HOBEIAN'), 'Athom needs exact HOBEIAN');
    assert.ok(mfr.some((x) => String(x).toLowerCase() === 'hobeian'));
    assert.ok(pid.includes('ZG-301Z'));
  });

  it('npm check:p2673 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2673']);
  });

  it('WiFi drivers do not carry stub zigbee without endpoints', () => {
    const driversDir = path.join(ROOT, 'drivers');
    for (const id of fs.readdirSync(driversDir)) {
      if (!id.startsWith('wifi_')) continue;
      const f = path.join(driversDir, id, 'driver.compose.json');
      if (!fs.existsSync(f)) continue;
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (!j.zigbee) continue;
      assert.ok(
        j.zigbee.endpoints && Object.keys(j.zigbee.endpoints).length > 0,
        `${id} has zigbee without endpoints`,
      );
    }
  });
});
