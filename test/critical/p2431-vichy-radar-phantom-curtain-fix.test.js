'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('P2431 — VicHY #2224/#2227 Radar Phantom Curtain & Battery Warning Fix', () => {

  it('DeviceFingerprintDB resolves _TZE204_clrdrnya exact and caseless to presence_sensor_radar (mains)', () => {
    const DeviceFingerprintDB = require('../../lib/DeviceFingerprintDB');
    for (const mfr of ['_TZE204_clrdrnya', '_tze204_clrdrnya', '_TZE204_CLRDRNYA', '_TZE200_clrdrnya', '_TZE284_clrdrnya']) {
      const dev = DeviceFingerprintDB.lookup(mfr, 'TS0601');
      assert.ok(dev, `Must resolve ${mfr}|TS0601`);
      assert.strictEqual(dev.driver, 'presence_sensor_radar');
      assert.strictEqual(dev.powerSource, 'mains');
    }
  });

  it('AutonomousMigrationManager blocks adaptation of presence_sensor_radar to curtain or any driver', async () => {
    const AutonomousMigrationManager = require('../../lib/managers/AutonomousMigrationManager');
    const mockDevice = {
      driver: { id: 'presence_sensor_radar', manifest: { class: 'sensor' } },
      getData: () => ({ modelId: 'TS0601', manufacturerName: '_TZE204_clrdrnya' }),
      getCapabilities: () => ['alarm_motion'],
      hasCapability: (c) => c === 'alarm_motion',
      getSetting: () => null,
      getStoreValue: () => null,
      log: () => {},
      error: () => {},
      zclNode: { endpoints: {} }
    };

    const mgr = new AutonomousMigrationManager(mockDevice);
    const rec = await mgr._getRecommendation({
      modelId: 'TS0601',
      manufacturer: '_TZE204_clrdrnya',
      currentDriver: 'presence_sensor_radar',
      currentCapabilities: ['alarm_motion'],
      clusters: { input: [], output: [] },
      deviceType: 'sensor'
    });

    assert.strictEqual(rec.targetDriver, 'presence_sensor_radar', 'Target driver must remain presence_sensor_radar');
    assert.strictEqual(rec.needsAdaptation, false, 'Radar presence driver must never need adaptation');
  });

  it('user-misattribution-registry locks clrdrnya to presence_sensor_radar and forbids curtain_motor', () => {
    const regPath = path.join(__dirname, '../../data/user-misattribution-registry.json');
    const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
    const hit = reg.cases.find(c => c.id === 'vichy-clrdrnya-presence');
    assert.ok(hit, 'Must have case vichy-clrdrnya-presence');
    assert.strictEqual(hit.canonicalDriver, 'presence_sensor_radar');
    assert.ok(hit.forbiddenDrivers.includes('curtain_motor'), 'Must forbid curtain_motor');
    assert.ok(hit.forbiddenDrivers.includes('curtain_motor_shutter'), 'Must forbid curtain_motor_shutter');
    assert.ok(hit.mfr.includes('_TZE204_clrdrnya'), 'Must contain _TZE204_clrdrnya');
  });

  it('driver-mapping-database.json maps clrdrnya to presence_sensor_radar', () => {
    const mapPath = path.join(__dirname, '../../data/driver-mapping-database.json');
    if (!fs.existsSync(mapPath)) return;
    const db = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    const drivers = db.mfr_index['_TZE204_clrdrnya'];
    assert.ok(Array.isArray(drivers), 'Must have mfr_index for _TZE204_clrdrnya');
    assert.ok(drivers.includes('presence_sensor_radar'), 'Must map to presence_sensor_radar');
    assert.ok(!drivers.includes('motion_sensor_radar_mmwave'), 'Must not map to motion_sensor_radar_mmwave');
  });

  it('presence_sensor_radar device.js clears energy with batteries: null on mains radar', () => {
    const devPath = path.join(__dirname, '../../drivers/presence_sensor_radar/device.js');
    const src = fs.readFileSync(devPath, 'utf8');
    assert.ok(src.includes('await this.setEnergy({ batteries: null, mains: true })'), 'Must call setEnergy with batteries: null, mains: true');
  });

  it('SmartBatteryManager clears energy with batteries: null on mains/kinetic devices', () => {
    const sbmPath = path.join(__dirname, '../../lib/managers/SmartBatteryManager.js');
    const src = fs.readFileSync(sbmPath, 'utf8');
    assert.ok(src.includes('await this.device.setEnergy({ batteries: null, mains: true })'), 'Must call setEnergy with batteries: null, mains: true');
  });

  it('DeviceFingerprintDB contains Gmail typo/truncated alias fingerprints', () => {
    const DeviceFingerprintDB = require('../../lib/DeviceFingerprintDB');
    assert.strictEqual(DeviceFingerprintDB.lookup('_TZ3000_dpo1ysaak', 'TS011F')?.driver, 'plug');
    assert.strictEqual(DeviceFingerprintDB.lookup('_TZ3000_fa9mlvjaa', 'TS0041')?.driver, 'remote_button_wireless');
    assert.strictEqual(DeviceFingerprintDB.lookup('_TZ3210_ngqk6jiaa', 'TS110E')?.driver, 'wall_dimmer_tuya');
    assert.strictEqual(DeviceFingerprintDB.lookup('_TZ3210_w0qqde', 'TS011F')?.driver, 'plug_energy_monitor');
    assert.strictEqual(DeviceFingerprintDB.lookup('_TZ321C_fkziha', 'TS0225')?.driver, 'presence_sensor_radar');
  });

});
