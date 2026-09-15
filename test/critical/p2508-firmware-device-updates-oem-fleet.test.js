'use strict';

/**
 * P2508 — Homey Device Updates fleet: OEM only, never pvvx community bricks.
 * Contre quoi: soil/contact shipping Hobeian/Wing pvvx images; missing plug_energy_monitor SSOT.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

describe('P2508 firmware Device Updates (OEM fleet, no pvvx)', () => {
  it('SSOT expects OEM drivers only (no soil/contact pvvx)', () => {
    const ssot = readJson('config/architecture/homey-device-updates.json');
    assert.ok(ssot.safety?.refusePvvxCommunity === true);
    assert.ok(ssot.sources.excluded.some((x) => /pvvx/i.test(x)));
    assert.ok(!ssot.coveredDriversExpected.includes('soil_sensor'));
    assert.ok(!ssot.coveredDriversExpected.includes('contact_sensor'));
    assert.ok(ssot.coveredDriversExpected.includes('plug_energy_monitor'));
    assert.ok(ssot.coveredDriversExpected.includes('wall_dimmer_tuya'));
  });

  it('builder rejects pvvx URL path + uses Koenkk modelId', () => {
    const src = fs.readFileSync(path.join(ROOT, 'tools/ci/build-firmware-updates.js'), 'utf8');
    assert.ok(src.includes('isPvvxCommunity'));
    assert.ok(src.includes('/pvvx/'));
    assert.ok(src.includes('normalizeOtaModelId'));
    assert.ok(src.includes('tightProductIds(entry, driver.pids, fileName, img)'));
  });

  it('gate forbids known pvvx basenames', () => {
    const src = fs.readFileSync(path.join(ROOT, 'tools/ci/firmware-updates-gate.js'), 'utf8');
    assert.ok(src.includes('pvvx/community OTA image forbidden'));
  });

  it('soil_sensor and contact_sensor ship no firmwareUpdates / no pvvx bins', () => {
    for (const id of ['soil_sensor', 'contact_sensor']) {
      const compose = readJson(`drivers/${id}/driver.compose.json`);
      assert.ok(!compose.firmwareUpdates, `${id} must not declare firmwareUpdates`);
      const fwDir = path.join(ROOT, 'drivers', id, 'assets', 'firmware');
      if (fs.existsSync(fwDir)) {
        const bins = fs.readdirSync(fwDir).filter((f) => /\.(bin|zigbee)$/i.test(f));
        assert.strictEqual(bins.length, 0, `${id} orphan OTA bins: ${bins.join(',')}`);
      }
    }
  });

  it('OEM drivers still declare firmwareUpdates with assets', () => {
    for (const id of ['wall_dimmer_tuya', 'switch_1gang', 'smartplug', 'plug_energy_monitor']) {
      const compose = readJson(`drivers/${id}/driver.compose.json`);
      const updates = compose.firmwareUpdates?.updates || [];
      assert.ok(updates.length >= 1, `${id} missing firmwareUpdates`);
      const name = updates[0].files?.[0]?.name;
      assert.ok(name && !/pvvx/i.test(name), `${id} bad file ${name}`);
      assert.ok(fs.existsSync(path.join(ROOT, 'drivers', id, 'assets', 'firmware', name)), `${id} missing bin`);
    }
  });

  it('HomeyDeviceUpdates softAnnounceNativeOta exported + wired', () => {
    const hdu = fs.readFileSync(path.join(ROOT, 'lib/ota/HomeyDeviceUpdates.js'), 'utf8');
    assert.ok(hdu.includes('softAnnounceNativeOta'));
    const tz = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
    assert.ok(tz.includes('softAnnounceNativeOta'));
  });
});
