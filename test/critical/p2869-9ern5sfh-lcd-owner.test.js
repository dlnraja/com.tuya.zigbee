'use strict';
// WHY(P2869, 2026-10-19 user decision): _TZE284_9ern5sfh + TS0601 is the RSH-HS03 LCD temperature/humidity sensor
// (Z2M tuya.ts TS0601_temperature_humidity_sensor_4: DP1 temp/10, DP2 humidity/10, DP4 battery; zhc #10167 external
// converter "with display"; JohanBendz #1328 RSH-HS03; forum 140352 #2263 Kizabgd). Master moved it to
// lcdtemphumidsensor in P2823; stable-v5 and bastien-home now follow. One couple, one driver, on every tree.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const OWNER = 'lcdtemphumidsensor';

function owners(mfr, pid) {
  const out = [];
  for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const p = path.join(ROOT, 'drivers', id, 'driver.compose.json');
    if (!fs.existsSync(p)) { continue; }
    const z = JSON.parse(fs.readFileSync(p, 'utf8')).zigbee || {};
    const mf = (z.manufacturerName || []).map((m) => String(m).toLowerCase());
    const pids = (z.productId || []).map((m) => String(m).toLowerCase());
    if (mf.includes(mfr.toLowerCase()) && pids.includes(pid.toLowerCase())) { out.push(id); }
  }
  return out;
}

describe('P2869 _TZE284_9ern5sfh + TS0601 → lcdtemphumidsensor only', () => {
  it('compose: exactly one owner, the LCD driver (all 9ern5sfh prefixes)', () => {
    for (const mfr of ['_TZE284_9ern5sfh', '_TZE204_9ern5sfh', '_TZE200_9ern5sfh']) {
      assert.deepEqual(owners(mfr, 'TS0601'), [OWNER], mfr);
    }
  });
  it('app.json mirrors the compose (climate_sensor no longer lists it)', () => {
    const app = readJson('app.json');
    const appOwners = app.drivers
      .filter((x) => (x.zigbee?.manufacturerName || []).some((m) => m.toLowerCase() === '_tze284_9ern5sfh'))
      .map((x) => x.id);
    assert.deepEqual(appOwners, [OWNER]);
  });
  it('pin + curated removal guard it against bot re-adds', () => {
    const pins = readJson('config/architecture/couple-driver-pins.json').pins;
    assert.ok(pins.some((p) => p.driver === OWNER && p.pid === 'TS0601' && p.mfr.includes('_TZE284_9ern5sfh')));
    const rem = readJson('config/architecture/curated-couple-removals.json').removals;
    assert.ok(rem.some((r) => r.driver === 'climate_sensor' && r.mfr.includes('_TZE284_9ern5sfh')));
  });
  it('LCD driver decodes humidity with the /10 divisor Z2M uses for this couple', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers', OWNER, 'device.js'), 'utf8');
    const direct = src.match(/DIRECT_HUMIDITY_MANUFACTURERS\s*=\s*\[([^\]]*)\]/);
    assert.ok(direct, 'direct-humidity list present');
    assert.ok(!/9ern5sfh/i.test(direct[1]), '9ern5sfh must not be in the no-divisor list');
    assert.match(src, /2:\s*\{\s*capability:\s*'measure_humidity',\s*divisor:\s*usesDirectHumidity\s*\?\s*1\s*:\s*10/);
  });
});
