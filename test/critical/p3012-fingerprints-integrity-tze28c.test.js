'use strict';

/**
 * P3012 — validate:fingerprints had 4 errors on master (keys in data/fingerprints.json
 * not present literally in the target driver.compose.json).
 *  - `_TZE28C1000000_rzdkn5rx` is a REAL id: Z2M tuya.ts TS0601_multifunction_switch
 *    (Zemismart ZNS-LRL2E 30A immersion switch), Koenkk/zigbee-herdsman-converters #13211
 *    (Andy, 2026-09-16) + Homey forum t/26439/5484 & t/154092. Re-claimed on
 *    boiler_switch_energy (same driver as stable-v5 / bastien-home → paired devices keep working).
 *  - `_TZE28C100000_rzdkn5rx` (5 zeros) is OCR junk (registry p2509-invent-junk-do-not-lock).
 *  - `_TZ3000_RUXEXJFZ` / `_TYZB01_6G8B7AT8` were all-uppercase duplicates of keys already present.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

describe('P3012 fingerprints integrity (TZE28C rzdkn5rx + uppercase dupes)', () => {
  it('real long-prefix id claimed by boiler_switch_energy in compose and app.json', () => {
    const c = J('drivers/boiler_switch_energy/driver.compose.json');
    assert.ok(c.zigbee.manufacturerName.includes('_TZE28C1000000_rzdkn5rx'));
    assert.ok(c.zigbee.manufacturerName.includes('_TZE204_rzdkn5rx'), 'existing couple kept');
    assert.ok(c.zigbee.productId.includes('TS0601'));
    const app = J('app.json');
    const d = app.drivers.find((x) => x.id === 'boiler_switch_energy');
    assert.ok(d.zigbee.manufacturerName.includes('_TZE28C1000000_rzdkn5rx'));
  });

  it('junk 5-zero form is not claimed and not a fingerprint key', () => {
    const c = J('drivers/boiler_switch_energy/driver.compose.json');
    assert.ok(!c.zigbee.manufacturerName.some((m) => /^_tze28c100000_/i.test(m)));
    const fp = J('data/fingerprints.json');
    assert.ok(!('_TZE28C100000_rzdkn5rx' in fp));
    assert.strictEqual(fp._TZE28C1000000_rzdkn5rx.driverId, 'boiler_switch_energy');
  });

  it('uppercase duplicates removed, canonical keys kept', () => {
    const fp = J('data/fingerprints.json');
    assert.ok(!('_TZ3000_RUXEXJFZ' in fp));
    assert.ok(!('_TYZB01_6G8B7AT8' in fp));
    assert.strictEqual(fp._TZ3000_ruxexjfz.driverId, 'switch_2gang');
    assert.strictEqual(fp._TYZB01_6g8b7at8.driverId, 'switch_2gang');
  });

  it('validate:fingerprints script exits 0', () => {
    execFileSync(process.execPath, ['scripts/validation/verify_fingerprints_integrity.js'], { cwd: ROOT, stdio: 'pipe' });
  });
});
