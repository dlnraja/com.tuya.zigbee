'use strict';

/**
 * Registry couples must have a compound DeviceFingerprintDB key.
 * WHY: pid-only defaults invent rain/energy/1-gang from shared SKUs.
 * WHO: BOTH pairing. WHEN: CI. AGAINST: TS0207→rain, TS011F→energy plug.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '../..');
const DeviceFingerprintDB = require('../../lib/DeviceFingerprintDB');
const ManufacturerDeviceQuirkRegistry = require('../../lib/helpers/ManufacturerDeviceQuirkRegistry');

function loadRegistry() {
  const p = path.join(ROOT, 'data', 'user-misattribution-registry.json');
  return JSON.parse(Buffer.from(fs.readFileSync(p)).toString('utf8'));
}

function isLookupMfr(mfr) {
  if (!mfr) return false;
  if (mfr.startsWith('_') && mfr === mfr.toLowerCase()) return false;
  return true;
}

describe('device peculiarity compound locks', () => {
  it('looks up every registry couple in DeviceFingerprintDB', () => {
    const registry = loadRegistry();
    const missing = [];
    for (const c of registry.cases || []) {
      let hit = null;
      for (const mfr of [].concat(c.mfr || []).filter(isLookupMfr)) {
        for (const pid of [].concat(c.productId || [])) {
          const profile = DeviceFingerprintDB.lookup(mfr, pid);
          if (!profile?.driver) continue;
          if (String(profile.matchType || '').startsWith('productId')) continue;
          if (profile.driver === c.canonicalDriver) {
            hit = profile;
            break;
          }
        }
        if (hit) break;
      }
      if (!hit) missing.push(`${c.id} (${c.canonicalDriver})`);
    }
    assert.deepStrictEqual(missing, [], `missing compound hits:\n${missing.join('\n')}`);
  });

  it('does not invent water or rain from unknown TS0207', () => {
    const profile = DeviceFingerprintDB.lookup('_TZ3000_unknownxx', 'TS0207');
    assert(profile == null || profile.driver == null);
  });

  it('does not invent energy plug from unknown TS011F', () => {
    const profile = DeviceFingerprintDB.lookup('_TZ3000_unknownxx', 'TS011F');
    assert(profile == null || profile.driver == null);
  });

  it('keeps k4ej3ww2 water and 5k5vh43t repeater on the same pid', () => {
    assert.strictEqual(DeviceFingerprintDB.lookup('_TZ3000_k4ej3ww2', 'TS0207').driver, 'water_leak_sensor');
    assert.strictEqual(DeviceFingerprintDB.lookup('_TZ3000_5k5vh43t', 'TS0207').driver, 'zigbee_repeater');
  });

  it('quirks penalize climate for BSEED dimmer and soil for nt4pquef', () => {
    const dimmer = ManufacturerDeviceQuirkRegistry.analyze({
      manufacturerName: '_TZE284_m1cvyneb',
      modelId: 'TS0601',
    });
    assert(dimmer.quirks.some((q) => q.id === 'bseed_m1cvyneb_ef00_dimmer'));
    const climate = ManufacturerDeviceQuirkRegistry.driverEffect(dimmer, 'climate_sensor');
    assert(climate.penalty >= 40);

    const soil = ManufacturerDeviceQuirkRegistry.analyze({
      manufacturerName: '_TZE284_nt4pquef',
      modelId: 'TS0601',
    });
    assert(soil.quirks.some((q) => q.id === 'soil_nt4pquef_not_climate'));
  });

  it('quirks keep switch+temp off 1-gang', () => {
    const analysis = ManufacturerDeviceQuirkRegistry.analyze({
      manufacturerName: '_TZ3218_7fiyo3kv',
      modelId: 'TS000F',
    });
    assert(analysis.quirks.some((q) => q.id === 'switch_temp_tz3218_ts000f'));
    const effect = ManufacturerDeviceQuirkRegistry.driverEffect(analysis, 'switch_1gang');
    assert(effect.penalty >= 40);
  });

  it('keeps TS0207 off contact catch-alls and IAS clusters on contact_sensor', () => {
    const contact = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/contact_sensor/driver.compose.json'), 'utf8'));
    const pids = contact.zigbee.productId || [];
    assert(!pids.includes('TS0207'), 'contact_sensor must not claim water/repeater pid TS0207');
    const clusters = contact.zigbee.endpoints['1'].clusters || [];
    assert(clusters.includes(1280), 'contact_sensor EP1 needs IAS Zone 1280');
    const mfrs = (contact.zigbee.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert(!mfrs.includes('_tze204_2imwyigp'), 'MG-ZG03W 3-gang sibling must not live on contact');
  });
});
