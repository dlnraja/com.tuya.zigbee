'use strict';
// P3018b (user decision 2026-10-24): every catalog couple has exactly one driver; the specific
// driver (Z2M hardware match) wins, caseless forms stay in the winner. Sources: couple-driver-pins.json.
// WHY: the critical suite runs this with `node --test` too, so no mocha globals.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const compose = (d) => JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', d, 'driver.compose.json'), 'utf8')).zigbee || {};
const pins = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'architecture', 'couple-driver-pins.json'), 'utf8')).pins
  .filter((p) => /^P3018b/.test(p.source || ''));
const drivers = fs.readdirSync(path.join(ROOT, 'drivers')).filter((d) => fs.existsSync(path.join(ROOT, 'drivers', d, 'driver.compose.json')));
const holders = (mfr, pid) => drivers.filter((d) => {
  const z = compose(d);
  return (z.manufacturerName || []).some((m) => m.toLowerCase() === mfr.toLowerCase()) && (z.productId || []).some((p) => p.toLowerCase() === pid.toLowerCase());
});

describe('P3018b one couple, one driver', () => {
  it('pins exist for the 21 de-duplicated couples + 1 placed interview couple + 9 soil sensors, each with a Z2M source', () => {
    assert.strictEqual(pins.reduce((n, p) => n + p.mfr.length, 0), 31); // 22 (dedup + placed) + 9 soil (_TZE284_2se8efxh held: shipped OTA on water_leak_sensor)
    for (const p of pins) { assert.match(p.source, /zigbee-herdsman-converters\/blob\/[0-9a-f]{40}\//); }
  });
  it('each pinned couple has exactly its winner as holder, caseless forms included', () => {
    for (const p of pins) {
      for (const m of p.mfr) {
        assert.deepStrictEqual(holders(m, p.pid), [p.driver], `${m}|${p.pid}`);
        if (/^_T/.test(m)) {
          const z = compose(p.driver).manufacturerName || [];
          assert.ok(z.includes(m.toLowerCase()) || z.includes(m), `${m} canonical form kept in ${p.driver}`);
        }
      }
    }
  });
  it('the coverage audit reports no couple served by two drivers', () => {
    const A = require('../../scripts/kb/dp-endpoint-coverage.js').audit();
    const seen = new Map();
    for (const c of A.couples) { const k = `${c.mfr}|${c.pid}`; seen.set(k, (seen.get(k) || 0) + 1); }
    assert.deepStrictEqual([...seen].filter(([, n]) => n > 1), []);
  });
  it('interviewed couples without a driver are only the documented holds', () => {
    const A = require('../../scripts/kb/dp-endpoint-coverage.js').audit();
    const none = A.interviews.filter((i) => !i.driver).map((i) => `${i.mfr}|${i.pid}`).sort();
    // WHY: eWeLight TS0502B is held out by the A2 publish bisect (pcr2 tests); SONOFF MINI-ZBRBS got its own driver (P3080);
    // Signify Hue remotes need the Philips 0xFC00 decoder (KB doc lists them as open).
    for (const k of none) { assert.match(k, /^(eWeLight\|TS0502B|Signify Netherlands B\.V\.\|RWL022|Signify Netherlands B\.V\.\|RDM001)$/, k); }
  });
  it('_TYST11_jeaxp72v + eaxp72v (Siterwell GS361A-H04) lands in device_radiator_valve only', () => {
    assert.deepStrictEqual(holders('_TYST11_jeaxp72v', 'eaxp72v'), ['device_radiator_valve']);
    assert.deepStrictEqual(holders('_TYST11_jeaxp72v', 'TS0601'), ['device_radiator_valve']);
  });
  it('real Zigbee soil sensors (Z2M tuya.ts soil defs) are owned by soil_sensor only, all three case forms', () => {
    // WHY: generic drivers (climate/curtain/leak/radar) held them; air_purifier_soil has no real hardware.
    for (const m of ['_TZE200_9cqcpkgb', '_TZE284_33bwcga2', '_TZE284_3urschql', '_TZE284_ap9owrsa',
      '_TZE284_nhgdf6qr', '_TZE284_wckqztdq', '_TZE284_65gzcss7', '_TZE284_yzr43ayq', '_TZE284_k7p2q5d9']) {
      assert.deepStrictEqual(holders(m, 'TS0601'), ['soil_sensor'], m);
      const z = compose('soil_sensor').manufacturerName;
      for (const f of [m, m.toLowerCase(), m.toUpperCase()]) { assert.ok(z.includes(f), f); }
    }
  });
});
