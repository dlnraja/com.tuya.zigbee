'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  isBatteryCoverMfr,
  isMainsCo2Mfr,
} = require('../../lib/helpers/batteryPowerSource');
const { getMagicPacketConfig } = require('../../lib/tuya/MagicPacketRegistry');
const MCUFormatDatabase = require('../../lib/tuya/MCUFormatDatabase');

describe('P2296 Homey SDK battery + power-source locks', () => {
  it('Homey rule: recent drivers never ship both measure_battery and alarm_battery', () => {
    for (const id of ['air_quality_co2', 'curtain_motor', 'button_wireless_1', 'wall_thermostat']) {
      const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
      const caps = j.capabilities || [];
      assert.ok(!(caps.includes('measure_battery') && caps.includes('alarm_battery')), id);
      if (caps.includes('measure_battery') || caps.includes('alarm_battery')) {
        assert.ok(Array.isArray(j.energy?.batteries) && j.energy.batteries.length, `${id} needs energy.batteries`);
      }
    }
  });

  it('curtain_motor exposes measure_battery and OTHER pack for ZM16EL class', () => {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'), 'utf8'));
    assert.ok(j.capabilities.includes('measure_battery'));
    assert.deepEqual(j.energy.batteries, ['OTHER']);
    assert.ok(!j.energy.approximation, 'battery devices must not use energy.approximation');
  });

  it('Zemismart cover mfrs are battery; ogkdpgy2/3ejwxpmu are mains CO2', () => {
    assert.equal(isBatteryCoverMfr('_TZE200_68nvbio9'), true);
    assert.equal(isBatteryCoverMfr('_TZE200_68nvbi09'), true);
    assert.equal(isBatteryCoverMfr('_TZE200_cf1sl3tj'), true);
    assert.equal(isMainsCo2Mfr('_TZE204_ogkdpgy2'), true);
    assert.equal(isMainsCo2Mfr('_TZE200_3ejwxpmu'), true);
    assert.equal(isMainsCo2Mfr('_TZE204_mpbki2zm'), false);
  });

  it('MagicPacket skips mcuVersionRequest for battery covers', () => {
    const cfg = getMagicPacketConfig('_TZE200_68nvbio9', 'TS0601');
    assert.ok(cfg);
    assert.ok(!cfg.packets.some((p) => p.command === 'mcuVersionRequest'));
    assert.ok(cfg.packets.some((p) => p.command === 'dataQuery'));
  });

  it('FIRMWARE_BUGS disable MCU version response for ZM16EL', () => {
    const bug = MCUFormatDatabase.getFirmwareBug('_TZE200_68nvbio9');
    assert.equal(bug?.fix?.type, 'DISABLE_MCU_VERSION_RESPONSE');
  });

  it('air_quality_co2 device.js strips battery for mains CO2 and avoids alarm_battery', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/air_quality_co2/device.js'), 'utf8');
    assert.match(src, /isMainsCo2Mfr/);
    assert.match(src, /ensureBatteryBestPractices/);
    assert.match(src, /alarm_battery/);
    assert.match(src, /3ejwxpmu/);
  });

  it('curtain_motor device.js keeps battery for battery covers', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/device.js'), 'utf8');
    assert.match(src, /isBatteryCoverMfr/);
    assert.match(src, /addCapability\('measure_battery'\)/);
    assert.doesNotMatch(src, /Remove battery capabilities for mains-powered devices/);
  });

  it('button_wireless_1 measure_battery is getable (Homey battery UI)', () => {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'), 'utf8'));
    const opts = j.capabilitiesOptions?.measure_battery || {};
    assert.notEqual(opts.getable, false);
  });
});
