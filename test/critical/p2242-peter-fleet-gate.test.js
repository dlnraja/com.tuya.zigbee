'use strict';

/**
 * P2242 — Peter_van_Werkhoven fleet regression gate (BOTH tracks)
 * Cross-ref: forum #2183–2190, diags 96c19859 / 1cf775a2 / 0cea6870 / 634f7b19
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P2242 Peter fleet gate', () => {
  it('SOS battery spike guard + flow debounce (0cea6870)', () => {
    const dev = read('drivers/button_emergency_sos/device.js');
    const drv = read('drivers/button_emergency_sos/driver.js');
    assert.match(dev, /Ignore spike.*<2s/);
    assert.match(dev, /sos_battery_last_write_at/);
    assert.match(drv, /sos_battery_low_flow_at/);
    assert.match(drv, /60_000/);
  });

  it('contact + water re-attach IAS on wake (#2183)', () => {
    assert.match(read('drivers/contact_sensor/device.js'), /_reattachIasOnWake/);
    assert.match(read('drivers/water_leak_sensor/device.js'), /_reattachIasOnWake/);
    assert.match(read('lib/devices/UnifiedSensorBase.js'), /skip dataQuery \(IAS\/ZCL sleepy\)/);
  });

  it('heap-critical defers DataRecovery until wake (96c19859)', () => {
    assert.match(read('lib/devices/BaseUnifiedDevice.js'), /_deferDataRecoveryInit = true/);
    assert.match(read('lib/devices/ButtonDevice.js'), /_deferDataRecoveryInit/);
  });

  it('IAS zone object coerce exported (Peter #2184)', () => {
    const mod = require('../../lib/managers/IASZoneEnhanced');
    assert.strictEqual(typeof mod.coerceZoneStatusToUint16, 'function');
    assert.strictEqual(mod.coerceZoneStatusToUint16({ type: 'Buffer', data: [1, 0] }), 1);
  });

  it('user-impact catalog documents Peter fleet without invented couples', () => {
    const cat = JSON.parse(read('data/user-impact-catalog.json'));
    const p = cat.users?.Peter_van_Werkhoven;
    assert.ok(p, 'Peter_van_Werkhoven profile missing');
    assert.ok(p.diags?.length >= 3);
    const absent = (p.devices || []).every((d) => d.couple == null);
    assert.strictEqual(absent, true, 'must not invent sacred couples for Peter tiles');
    const forbidden = p.forbiddenInvent || [];
    assert.ok(forbidden.some((x) => /k4ej3ww2/i.test(x)), 'forbiddenInvent must warn against k4ej glue');
    assert.ok(forbidden.some((x) => /mrpevh8p/i.test(x)), 'forbiddenInvent must warn against mrpe glue');
  });
});
