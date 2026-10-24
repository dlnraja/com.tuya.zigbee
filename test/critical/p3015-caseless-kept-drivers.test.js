'use strict';

// P3015 — 2026-10-24 (user requests 20:59 + 21:03 Paris).
// After P3014 "one driver per couple", the KEPT driver must recognise each couple whatever the case or
// invisible characters the device reports:
//  - pairing: Homey manifest matching is case-sensitive → canonical + lower + UPPER forms in compose/app.json
//    (same idea as tools/ci/ensure-case-variants.js); no other driver may hold any form of the couple.
//  - runtime: TuyaNormalizer.normalize() is caseless, trims padding and now strips zero-width chars, and
//    lib/tuya/fingerprints.json (+ fp-shards) points every variant to the kept driver.
// Sources (Zigbee2MQTT, pinned eb823146c7):
//  moes.ts#L1488 Moes ZWV-YC TS0049 _TZ3000_cjfmu5he/_mq4wujmp/_5af5r192/_ogjpfoyn; tuya.ts#L26460 Haozee HZ-WT02 _kz1anoi8.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const { normalize } = require('../../lib/utils/TuyaNormalizer');

const forms = (id) => { const c = id.replace(/^_t(z[e0-9]?\d*)_/i, (x) => x.toUpperCase()); return [...new Set([c, c.toLowerCase(), c.toUpperCase()])]; };
const odd = (id) => [
  id.split('').map((ch, i) => i % 2 ? ch.toUpperCase() : ch.toLowerCase()).join(''), // mIxEd
  `  ${id} `, `${id}\u0000`, `\uFEFF${id}`, `${id}\u200B`, `_${'\u200D'}${id.slice(1)}`, `${id}\u00A0`, `${id.toUpperCase()}\u2060`,
];

const composes = fs.readdirSync(path.join(ROOT, 'drivers'))
  .filter((d) => fs.existsSync(path.join(ROOT, 'drivers', d, 'driver.compose.json')))
  .map((d) => ({ id: d, z: readJson(`drivers/${d}/driver.compose.json`).zigbee || {} }));
const app = readJson('app.json');

function pairOwners(list, v, pid) {
  return list.filter((d) => [].concat(d.z.manufacturerName || []).includes(v) && [].concat(d.z.productId || []).includes(pid)).map((d) => d.id);
}
function runtimeOwners(v, pid) {
  return composes.filter((d) => [].concat(d.z.manufacturerName || []).some((m) => normalize(m) === normalize(v))
    && [].concat(d.z.productId || []).includes(pid)).map((d) => d.id);
}
const dimOwner = runtimeOwners('_TZE284_la2c2uo9', 'TS0601');
const CASES = [
  ...['_TZ3000_cjfmu5he', '_TZ3000_mq4wujmp', '_TZ3000_5af5r192', '_TZ3000_ogjpfoyn', '_TZ3000_kz1anoi8'].map((id) => ({ id, pid: 'TS0049', keep: 'water_valve_garden' })),
  { id: '_TZE284_la2c2uo9', pid: 'TS0601', keep: dimOwner[0] },
];
if (composes.some((d) => d.id === 'valve_novato_zpv01')) {
  for (const id of ['_TZE204_dsagrkvg', '_TZE284_sdvbnmj5', '_TZE284_zm8zpwas']) {CASES.push({ id, pid: 'TS0601', keep: 'valve_novato_zpv01' });}
}

describe('P3015 kept drivers are caseless at pairing and at runtime', () => {
  it('normalize strips padding, control and zero-width chars, caseless', () => {
    for (const v of odd('_TZ3000_cjfmu5he')) {assert.strictEqual(normalize(v), '_tz3000_cjfmu5he', JSON.stringify(v));}
  });

  for (const c of CASES) {
    it(`${c.id}/${c.pid} → only ${c.keep}`, () => {
      assert.ok(c.keep, 'kept driver exists');
      for (const v of forms(c.id)) {
        assert.deepStrictEqual(pairOwners(composes, v, c.pid), [c.keep], `compose pairing ${v}`);
        const appList = app.drivers.map((d) => ({ id: d.id, z: d.zigbee || {} }));
        assert.deepStrictEqual(pairOwners(appList, v, c.pid), [c.keep], `app.json pairing ${v}`);
      }
      for (const v of [...forms(c.id), ...odd(c.id)]) {
        assert.deepStrictEqual(runtimeOwners(v, c.pid), [c.keep], `runtime ${JSON.stringify(v)}`);
      }
    });

    it(`${c.id}: no other driver holds any form of it, whatever the productId`, () => {
      const holders = composes.filter((d) => [].concat(d.z.manufacturerName || []).some((m) => normalize(m) === normalize(c.id))).map((d) => d.id);
      assert.deepStrictEqual(holders, [c.keep]);
    });

    it(`${c.id}: runtime fingerprint DB resolves every variant to ${c.keep}`, () => {
      const db = require('../../lib/tuya/DeviceFingerprintDB');
      for (const v of [...forms(c.id), ...odd(c.id)]) {
        const fp = db.getFingerprint(v, c.pid);
        assert.ok(fp, `fp ${JSON.stringify(v)}`);
        assert.strictEqual(fp.driverId, c.keep, `fp driver ${JSON.stringify(v)}`);
      }
    });
  }

  it('fingerprints.json has no entry for these couples pointing elsewhere', () => {
    const fp = readJson('lib/tuya/fingerprints.json');
    for (const c of CASES) {
      for (const [k, e] of Object.entries(fp)) {
        if (normalize(k) === normalize(c.id)) {assert.strictEqual(e.driverId, c.keep, k);}
      }
    }
  });

  it('kept-driver pin for the TS0049 valves', () => {
    const pins = readJson('config/architecture/couple-driver-pins.json').pins;
    const p = pins.find((x) => x.id === 'p3015-moes-ts0049-valve');
    assert.ok(p && p.driver === 'water_valve_garden' && p.pid === 'TS0049');
    assert.ok(p.mfr.includes('_TZ3000_5af5r192') && p.mfr.includes('_tz3000_ogjpfoyn'));
  });
});
