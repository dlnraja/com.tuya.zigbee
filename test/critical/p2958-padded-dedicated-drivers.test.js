'use strict';
// P2958: Z2M padded manufacturer forms get small dedicated drivers so every couple lives on exactly
// one driver. Sources (credit Koenkk/zigbee-herdsman-converters): hobeian.ts ZG-204ZV whiteLabel
// AY204T "AOYAN  "; tuya.ts TS0207 whiteLabel AY222Z "AOYAN"/"AOYAN  "; blitzwolf.ts BW-IS9
// "_TZ3000_eit7p838 " + TS0207 (plus the trimmed case forms required by the SSOT case gate; the
// trimmed name lives in water_leak_sensor_tuya without TS0207, so no couple is shared).
const test = require('node:test');
const assert = require('node:assert');
const app = require('../../app.json');
const c = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');

const SPECS = {
  presence_radar_aoyan_ay204t: { mfr: ['AOYAN  '], pid: ['AY204T'], base: 'presence_sensor_radar' },
  water_leak_aoyan_ay222z: { mfr: ['AOYAN', 'AOYAN  '], pid: ['AY222Z'], base: 'water_leak_sensor' },
  water_leak_blitzwolf_bw_is9: { mfr: ['_TZ3000_eit7p838 ', '_TZ3000_eit7p838', '_tz3000_eit7p838'], pid: ['TS0207'], base: 'water_leak_sensor' },
};

test('each dedicated driver lists only its exact Z2M couples, padding byte-exact', () => {
  for (const [id, s] of Object.entries(SPECS)) {
    const d = app.drivers.find((x) => x.id === id);
    assert.ok(d, id);
    assert.deepStrictEqual(d.zigbee.manufacturerName, s.mfr, id);
    assert.deepStrictEqual(d.zigbee.productId, s.pid, id);
  }
});

test('no new couple is held by a second driver', () => {
  for (const [id, s] of Object.entries(SPECS)) {
    for (const m of s.mfr) for (const p of s.pid) {
      const holders = app.drivers.filter((d) => (d.zigbee?.manufacturerName || []).includes(m) && (d.zigbee?.productId || []).includes(p)).map((d) => d.id);
      assert.deepStrictEqual(holders, [id], `${JSON.stringify(m)}|${p}`);
    }
  }
});

test('pairing uses native clusters of the base driver (lean [0] for the EF00 radar, IAS for leak)', () => {
  for (const [id, s] of Object.entries(SPECS)) {
    const d = app.drivers.find((x) => x.id === id); const base = app.drivers.find((x) => x.id === s.base);
    if (id !== 'presence_radar_aoyan_ay204t') assert.deepStrictEqual(d.zigbee.endpoints, base.zigbee.endpoints, id);
    assert.match(require('fs').readFileSync(require('path').join(__dirname, `../../drivers/${id}/device.js`), 'utf8'), new RegExp(`require\\('\\.\\./${s.base}/device'\\)`));
  }
  // radar: lean [0] (P2817) so an EF00 MCU pairs without a mandatory non-native cluster
  assert.deepStrictEqual(app.drivers.find((x) => x.id === 'presence_radar_aoyan_ay204t').zigbee.endpoints['1'].clusters, [0]);
});

test('publish compactor keeps the padded forms (case cap applies to trimmed forms only)', () => {
  const m = JSON.parse(JSON.stringify(app));
  c.compactZigbeeIdentifiers(m, {});
  for (const [id, s] of Object.entries(SPECS)) {
    const d = m.drivers.find((x) => x.id === id);
    for (const mf of s.mfr.filter((x) => x !== x.trim())) assert.ok(d.zigbee.manufacturerName.includes(mf), `${id} ${JSON.stringify(mf)}`);
  }
});

test('the radar runtime routes AY204T to the ZG-204ZV DP table', () => {
  const cfg = require('../../drivers/presence_sensor_radar/configs.js').getSensorConfig('AOYAN  ', 'AY204T');
  assert.match(String(cfg.configName || ''), /204ZV/i);
});
