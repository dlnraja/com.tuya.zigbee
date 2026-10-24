'use strict';

// P3018b — ZHA per-quirk + deCONZ DDF harvesters and their fill-only merge into the DP catalogue.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const zhaH = require('../../scripts/data/harvest-zha-quirk-dps');
const dcH = require('../../scripts/data/harvest-deconz-tuya-dps');
const { build } = require('../../scripts/data/build-unknown-dp-catalog');
const D = require('../../lib/zigbee/DpCatalogDecoder');

function tmp(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3018b-'));
  for (const [f, body] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), body); }
  return dir;
}

test('ZHA v2 builder chain → exact couple rows (temperature ZCL centi, divisor, bool)', () => {
  const dir = tmp({ 'zhaquirks/tuya/ts0601_x.py': [
    '# comment with .tuya_dp(9, fake)',
    '(',
    '    TuyaQuirkBuilder("_TZE200_abcdefgh", "TS0601")',
    '    .applies_to("_TZE204_abcdefgh", "TS0601")',
    '    .tuya_temperature(dp_id=1, scale=10)',
    '    .tuya_sensor(dp_id=7, attribute_name="voltage_x", type=t.uint16_t, divisor=1000)',
    '    .tuya_switch(dp_id=13, attribute_name="child_lock")',
    '    .add_to_registry()',
    ')',
  ].join('\n') });
  const out = zhaH.harvest(dir);
  const rows = out.couples['_TZE200_abcdefgh|TS0601'];
  assert.ok(rows, 'constructor couple');
  assert.ok(out.couples['_TZE204_abcdefgh|TS0601'], 'applies_to couple');
  const by = Object.fromEntries(rows.map((r) => [r[0], r]));
  assert.deepStrictEqual(by[1].slice(1), ['temperature', 'div:10']);
  assert.deepStrictEqual(by[7].slice(1), ['voltage_x', 'div:1000']);
  assert.deepStrictEqual(by[13].slice(1), ['child_lock', 'bool']);
  assert.ok(!by[9], 'commented code ignored');
});

test('deCONZ DDF Tuya items → rows (factor, bool, tf)', () => {
  const ddf = { manufacturername: ['_TZE200_zzzzzzzz'], modelid: ['TS0601'], subdevices: [{ items: [
    { name: 'state/temperature', parse: { fn: 'tuya', dpid: 1, eval: 'Item.val = Attr.val * 10;' } },
    { name: 'state/presence', parse: { fn: 'tuya', dpid: 2, eval: 'Item.val = Attr.val == 0;' } },
    { name: 'config/on', parse: { fn: 'zcl:attr', ep: 1, cl: '0x0006', at: '0x0000' } },
  ] }] };
  const dir = tmp({ 'devices/tuya/x.json': JSON.stringify(ddf) });
  const out = { couples: dcH.harvest(dir) };
  const rows = out.couples['_TZE200_zzzzzzzz|TS0601'];
  assert.ok(rows && rows.length === 2, JSON.stringify(out));
  const by = Object.fromEntries(rows.map((r) => [r[0], r]));
  assert.strictEqual(by[1][1], 'temperature');
  assert.strictEqual(D.decode(by[1][2], 225).value, 22.5, 'deCONZ 0.01 °C → Homey °C');
  assert.strictEqual(by[2][1], 'presence');
  assert.strictEqual(D.decode(by[2][2], 0).value, true);
});

test('merge is fill-only: Z2M converter never replaced; agreeing name gets a converter; new DP added', () => {
  const tuyaDps = { couples: { '_TZE200_merge001|TS0601': [[1, 'temperature', 'div:10'], [2, 'humidity', null], [3, 'mode', null]] } };
  const zhaQuirks = { couples: { '_TZE200_merge001|TS0601': [[1, 'temperature', 'div:100'], [2, 'humidity', 'raw'], [3, 'battery', 'raw'], [9, 'battery', 'raw']] } };
  const out = build({ z2m: {}, knowledge: { couples: {} }, tuyaDps, zhaQuirks, deconz: null });
  const key = '_tze200_merge001|TS0601';
  const pi = out.idx[key];
  const prof = out.profiles[pi];
  const cv = (out.cv && out.cv[pi]) || [];
  const rows = {};
  const convOf = {};
  for (let i = 0, j = 0; i < prof.length; i += 2, j++) { rows[prof[i]] = out.names[prof[i + 1]]; convOf[prof[i]] = Number.isInteger(cv[j]) && cv[j] >= 0 ? out.convs[cv[j]] : null; }
  assert.strictEqual(rows[1], 'temperature');
  assert.strictEqual(rows[3], 'mode', 'Z2M name kept, disagreeing source ignored');
  assert.strictEqual(rows[9], 'battery', 'DP unknown to Z2M added');
  const conv = (dp) => convOf[dp];
  assert.strictEqual(conv(1), 'div:10', 'Z2M converter wins');
  assert.strictEqual(conv(2), 'raw', 'same meaning → converter filled');
  assert.strictEqual(conv(3), null, 'different meaning → no converter');
});

test('shipped data: harvest files present, catalogue within budget, refresh.sh runs both harvesters', () => {
  const zq = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/zha-quirk-dps.json'), 'utf8'));
  const dc = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/deconz-tuya-dps.json'), 'utf8'));
  assert.ok(Object.keys(zq.couples).length >= 150 && Object.keys(dc.couples).length >= 100);
  assert.ok(fs.statSync(path.join(ROOT, 'lib/zigbee/data/unknown-dp-catalog.json')).size < 180000);
  const sh = fs.readFileSync(path.join(ROOT, 'scripts/kb/refresh.sh'), 'utf8');
  assert.ok(sh.includes('harvest-zha-quirk-dps.js') && sh.includes('harvest-deconz-tuya-dps.js'));
  // a ZHA-only fill reached the runtime decoder (exfrnlow: Z2M has no DP 102)
  const r = D.coupleDps('_TZE200_exfrnlow', 'TS0601').find((e) => e.dp === 102);
  assert.ok(r && r.name === 'local_temperature' && r.conv === 'div:10', JSON.stringify(r));
});
