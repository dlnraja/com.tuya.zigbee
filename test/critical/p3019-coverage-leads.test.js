'use strict';

// P3019 — coverage matrix completion and open leads.
//  - Arteco ZS-SF00 (A89G12C|Arteco): exact DP profile from Z2M tuya.ts, couple-locked in soil_sensor.
//  - MC101Z sinxpbrl DP2/6/7/101/102 (Z2M #31445 Tuya schema + Johan #1504): exact decoders.
//  - Boutons M3/M9 (0x8004) and Vannes M10 (HZ-WT02 0xE001 setCountdown 0xFE) flipped with sources.
// Device-level checks run in a child process (homey mocked) so no lib timers leak into mocha.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const P = require('../../lib/profiles/ZsSf00Profile');
const I = require('../../lib/zigbee/UnknownCommandInterpreter');
const C = require('../../lib/zigbee/MethodCoverage');
const has = (rel) => fs.existsSync(path.join(ROOT, rel));
const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

describe('P3019 ZS-SF00 profile (z2m tuya.ts ZS-SF00)', () => {
  it('matches only the exact couple, case-insensitive', () => {
    assert.strictEqual(P.isZsSf00('A89G12C', 'Arteco'), true);
    assert.strictEqual(P.isZsSf00('a89g12c', 'ARTECO'), true);
    assert.strictEqual(P.isZsSf00('A89G12C', 'TS0601'), false);
    assert.strictEqual(P.isZsSf00('_TZE284_65gzcss7', 'Arteco'), false);
  });
  it('decodes every Z2M datapoint with the Z2M conversion', () => {
    assert.deepStrictEqual(P.decode(3, 41), { dp: 3, capability: 'measure_humidity.soil', value: 41 });
    assert.deepStrictEqual(P.decode(5, 235), { dp: 5, capability: 'measure_temperature', value: 23.5 });
    assert.deepStrictEqual(P.decode(5, -15), { dp: 5, capability: 'measure_temperature', value: -1.5 });
    assert.deepStrictEqual(P.decode(14, 87), { dp: 14, capability: 'measure_battery', value: 87 });
    assert.deepStrictEqual(P.decode(101, 60), { dp: 101, capability: 'measure_humidity', value: 60 });
    assert.deepStrictEqual(P.decode(102, 1234), { dp: 102, capability: 'measure_luminance', value: 1234 });
    assert.deepStrictEqual(P.decode(107, -20), { dp: 107, store: 'zs_sf00_temperature_calibration', value: -2 });
    assert.deepStrictEqual(P.decode(111, 1), { dp: 111, capability: 'alarm_water', value: true });
    assert.deepStrictEqual(P.decode(112, Buffer.from([0, 0, 1, 44])), { dp: 112, capability: 'measure_ec', value: 300 });
    assert.deepStrictEqual(P.decode(115, 0), { dp: 115, store: 'zs_sf00_fertility_warning', value: false });
    for (const dp of [103, 104, 105, 106, 110, 114]) { assert.ok(P.decode(dp, 1).store, `DP${dp} is configuration → store`); }
  });
  it('leaves DPs outside the profile to the generic path', () => {
    assert.strictEqual(P.decode(2, 10), null);
    assert.strictEqual(P.decode(9, 1), null);
  });
  it('soil_sensor declares the Arteco productId (both cases) and keeps the old ones', () => {
    const z = json('drivers/soil_sensor/driver.compose.json').zigbee;
    for (const pid of ['Arteco', 'arteco', 'TS0601', 'ts0601', 'CS-201Z', 'ZG-303Z']) { assert.ok(z.productId.includes(pid), pid); }
    assert.ok(z.manufacturerName.some((m) => m === 'A89G12C'));
  });
});

describe('P3019 COUPLE_DP rows', () => {
  it('sinxpbrl DP2/6/7/101/102 decode on both manufacturer names', () => {
    for (const mfr of ['_TZE28C1000000_sinxpbrl', '_TZE284_sinxpbrl']) {
      const r = I.interpretDp({ dp: 2, datatype: 4, value: 1, mfr, pid: 'TS0601' });
      assert.strictEqual(r.exact, true); assert.deepStrictEqual(r.value, { work_mode: 'colour' });
      assert.deepStrictEqual(I.interpretDp({ dp: 102, datatype: 1, value: true, mfr, pid: 'TS0601' }).value, { do_not_disturb: true });
      assert.deepStrictEqual(I.interpretDp({ dp: 7, datatype: 2, value: 90, mfr, pid: 'TS0601' }).value, { countdown_s: 90 });
      assert.deepStrictEqual(I.interpretDp({ dp: 6, datatype: 0, value: Buffer.from([1, 2]), mfr, pid: 'TS0601' }).value, { scene_data: '0102' });
      assert.ok(/31445/.test(I.interpretDp({ dp: 101, datatype: 0, value: Buffer.from([0xaa]), mfr, pid: 'TS0601' }).source));
    }
  });
  it('sinxpbrl rows reject out-of-range values (no invented meaning)', () => {
    const r = I.interpretDp({ dp: 2, datatype: 4, value: 9, mfr: '_TZE284_sinxpbrl', pid: 'TS0601' });
    assert.notStrictEqual(r && r.family, 'couple');
  });
  it('ZS-SF00 rows reuse the driver profile', () => {
    const r = I.interpretDp({ dp: 102, datatype: 2, value: 800, mfr: 'A89G12C', pid: 'Arteco' });
    assert.strictEqual(r.exact, true);
    assert.deepStrictEqual(r.value, { measure_luminance: 800 });
    assert.ok(/ZS-SF00/.test(r.source));
  });
});

describe('P3019 method coverage', () => {
  const m = C.coverageMatrix();
  it('buttons: M3 and M9 flipped through the existing 0x8004 layer, M7/M8/M10 stay n/a', () => {
    assert.strictEqual(m.button_remote['read.private_cluster'], 'yes');
    assert.strictEqual(m.button_remote['write.attr_vs_cmd'], 'yes');
    for (const id of ['read.derived', 'write.zcl_cmd_to_dp', 'write.mfr_specific']) { assert.strictEqual(m.button_remote[id], 'n/a', id); }
  });
  it('valve M10 follows the helper presence (never "missing")', () => {
    const expected = has('lib/tuya/Ts0049Countdown.js') ? 'yes' : 'n/a';
    assert.strictEqual(m.valve_irrigation['write.mfr_specific'], expected);
  });
  it('every remaining n/a cell has a reason, every extra layer has a source', () => {
    for (const [f, row] of Object.entries(m)) {
      for (const [id, st] of Object.entries(row)) {
        assert.notStrictEqual(st, 'missing', `${f} ${id}`);
        if (st === 'n/a') { assert.notStrictEqual(C.naReason(f, id), 'not applicable', `${f} ${id}`); }
      }
    }
    for (const fam of Object.values(C.EXTRA_LAYERS)) { for (const l of Object.values(fam)) { for (const x of l) { assert.ok(x.src && x.what && x.impl); } } }
  });
  it('METHOD_COVERAGE.md is up to date', () => {
    const { render } = require('../../scripts/kb/method-coverage');
    assert.strictEqual(fs.readFileSync(path.join(ROOT, 'docs/knowledge/KB/METHOD_COVERAGE.md'), 'utf8'), render());
  });
});

describe('P3019 HZ-WT02 countdown (master only)', { skip: !has('lib/tuya/Ts0049Countdown.js') }, () => {
  it('builds the Z2M setCountdown frame: 0x0B + seconds u32 BE, 1..1440 min', () => {
    const T = require('../../lib/tuya/Ts0049Countdown');
    assert.strictEqual(T.buildPayload(30).toString('hex'), '0b00000708');
    assert.strictEqual(T.buildFrame(1, 7).toString('hex'), '0107fe0b0000003c');
    assert.strictEqual(T.buildPayload(0), null);
    assert.strictEqual(T.buildPayload(1441), null);
    assert.strictEqual(T.isTs0049Couple('_tz3000_KZ1ANOI8', 'ts0049'), true);
    assert.strictEqual(T.isTs0049Couple('_TZ3000_kz1anoi8', 'TS0001'), false);
  });
  it('parses the device answer like fzLocal.ts0049_countdown', () => {
    const T = require('../../lib/tuya/Ts0049Countdown');
    const raw = Buffer.from([0x09, 0x10, 0x0a, 0, 0, 0, 0x05, 0x0b, 0, 0, 0x07, 0x08]);
    assert.strictEqual(T.parseReport(raw), 30);
    assert.strictEqual(T.parseReport(Buffer.from([0, 0, 0x0b])), null);
  });
  it('sends only through node.sendFrame on endpoint 1 / 0xE001, never throws', async () => {
    const T = require('../../lib/tuya/Ts0049Countdown');
    const sent = [];
    const r = await T.sendCountdown({ node: { sendFrame: async (ep, cl, f) => { sent.push([ep, cl, f.toString('hex')]); } } }, 2);
    assert.strictEqual(r.ok, true);
    assert.deepStrictEqual(sent, [[1, 0xE001, '0101fe0b00000078']]);
    assert.strictEqual((await T.sendCountdown({}, 2)).ok, false);
    assert.strictEqual((await T.sendCountdown({ node: { sendFrame: async () => { throw new Error('x'); } } }, 2)).ok, false);
  });
});

const SCRIPT = `
const Module = require('module');
const orig = Module._load;
Module._load = function (r, ...a) {
  if (r === 'homey') { class B {} return { Device: B, Driver: B, App: B, SimpleClass: B, __: (k) => k }; }
  return orig.call(this, r, ...a);
};
const fs = require('fs');
function mk(C, mfr, pid, caps, extra = {}) {
  const d = Object.create(C.prototype); const values = {}; const store = {}; const settings = { zb_manufacturer_name: mfr, zb_model_id: pid };
  Object.assign(d, {
    _values: values, _store: store, _settings: settings,
    getSettings() { return settings; }, getSetting(k) { return settings[k]; }, setSettings: async (o) => { Object.assign(settings, o); },
    getData() { return { id: 'x', productId: pid }; }, getStoreValue(k) { return store[k] ?? null; }, setStoreValue: async (k, v) => { store[k] = v; },
    log() {}, error() {}, hasCapability: (c) => caps.includes(c), getCapabilities: () => caps, getCapabilityValue: (c) => values[c] ?? null,
    safeSetCapabilityValue: async (c, v) => { values[c] = v; }, setCapabilityValue: async (c, v) => { values[c] = v; },
    homey: { setTimeout, clearTimeout, setInterval, clearInterval, flow: { getDeviceTriggerCard() { return { trigger: async () => {} }; } } },
    driver: { id: 'drv', manifest: {} },
  }, extra);
  return d;
}
(async () => {
  const out = {};
  const Soil = require('./drivers/soil_sensor/device.js');
  const caps = ['measure_humidity.soil', 'measure_temperature', 'measure_humidity', 'measure_luminance', 'measure_battery', 'alarm_water', 'measure_ec', 'measure_conductivity'];
  let d = mk(Soil, 'A89G12C', 'Arteco', caps);
  for (const [dp, v] of [[3, 41], [5, 235], [101, 60], [102, 900], [103, 5], [106, 20], [107, -15], [111, 1], [112, 300], [14, 80]]) { await d._handleDP(dp, v); }
  out.sf00 = { values: d._values, store: d._store };
  d = mk(Soil, '_TZE284_oitavov2', 'TS0601', caps);
  await d._handleDP(103, 215);
  out.generic = { values: d._values, store: d._store };
  if (fs.existsSync('./drivers/mc101z_pwm_dimmer/device.js') && fs.readFileSync('./drivers/mc101z_pwm_dimmer/device.js', 'utf8').includes('DP_DO_NOT_DISTURB')) {
    const M = require('./drivers/mc101z_pwm_dimmer/device.js');
    const writes = [];
    const m = mk(M, '_TZE284_sinxpbrl', 'TS0601', ['onoff', 'dim'], { writeBool: async (dp, v) => { writes.push([dp, v]); return true; } });
    await m.processDatapoint({ dp: 2, datatype: 4, data: Buffer.from([1]) });
    await m.processDatapoint({ dp: 102, datatype: 1, data: Buffer.from([1]) });
    await m.onSettings({ oldSettings: {}, newSettings: { do_not_disturb: false }, changedKeys: ['other'] });
    const before = writes.length;
    await m.onSettings({ oldSettings: {}, newSettings: { do_not_disturb: false }, changedKeys: ['do_not_disturb'] });
    out.mc = { store: m._store, settings: m._settings, before, writes };
  }
  console.log('@@' + JSON.stringify(out));
  process.exit(0);
})().catch((e) => { console.log('@@ERR ' + e.stack); process.exit(1); });
`;

describe('P3019 device paths (child process)', () => {
  const r = spawnSync(process.execPath, ['-e', SCRIPT], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
  const line = (r.stdout || '').split('\n').find((l) => l.startsWith('@@')) || '@@ERR no output ' + r.stderr;
  it('child ran', () => { assert.ok(!line.startsWith('@@ERR'), line + (r.stderr || '').slice(-2000)); });
  const out = line.startsWith('@@ERR') ? {} : JSON.parse(line.slice(2));
  it('ZS-SF00 frames land on the right capabilities, config DPs go to the store', { skip: !out.sf00 }, () => {
    const v = out.sf00.values;
    assert.strictEqual(v['measure_humidity.soil'], 41);
    assert.strictEqual(v.measure_temperature, 23.5);
    assert.strictEqual(v.measure_humidity, 60);
    assert.strictEqual(v.measure_luminance, 900);
    assert.strictEqual(v.alarm_water, true);
    assert.strictEqual(v.measure_ec, 300);
    assert.strictEqual(v.measure_conductivity, 300);
    assert.strictEqual(v.measure_battery, 80);
    assert.strictEqual(out.sf00.store.zs_sf00_soil_sampling, 5);
    assert.strictEqual(out.sf00.store.zs_sf00_temperature_calibration, -1.5);
    assert.strictEqual(out.sf00.store.zs_sf00_illuminance_calibration, 20);
  });
  it('other soil couples keep the generic map (DP103 = temperature)', { skip: !out.generic }, () => {
    assert.strictEqual(out.generic.store.zs_sf00_soil_sampling, undefined);
    assert.ok(Number.isFinite(out.generic.values.measure_temperature));
  });
  it('MC101Z stores DP2/DP102, mirrors DND, writes DP102 only when the user changes it', { skip: !out.mc }, () => {
    assert.strictEqual(out.mc.store.mc101z_work_mode, 'colour');
    assert.strictEqual(out.mc.store.mc101z_do_not_disturb, true);
    assert.strictEqual(out.mc.settings.do_not_disturb, true);
    assert.strictEqual(out.mc.before, 0);
    assert.deepStrictEqual(out.mc.writes, [[102, false]]);
  });
});

describe('P3019 open-leads harvest', () => {
  const ROOT_OL = path.join(__dirname, '..', '..');
  const leads = JSON.parse(fs.readFileSync(path.join(ROOT_OL, 'data/leads/open-protocol-leads.json'), 'utf8'));
  const { matchLead } = require(path.join(ROOT_OL, 'scripts/kb/open-leads.js'));
  it('keeps TS0726 DP18-20 and 0x1888 open, ZS-SF00 and sinxpbrl resolved with a source', () => {
    assert.deepStrictEqual(leads.open.map((l) => l.id).sort(), ['cluster-0x1888', 'ts0726-dp18-20']);
    for (const r of leads.resolved) { assert.ok(r.source && r.source.length > 10, r.id); }
    for (const l of leads.open) { assert.ok(l.queries.length >= 3 && l.searched.length >= 3, l.id); }
  });
  it('matchLead needs every `all` term in the file and one `any` regex on the line', () => {
    const ts = leads.open.find((l) => l.id === 'ts0726-dp18-20');
    assert.strictEqual(matchLead(ts, 'dp 19 = inching').length, 0);
    assert.strictEqual(matchLead(ts, 'TS0726\ndp 19 = inching').length, 1);
    const c = leads.open.find((l) => l.id === 'cluster-0x1888');
    assert.strictEqual(matchLead(c, 'cluster 0x1888 attr 0x0001').length, 1);
  });
  it('refresh.sh runs the scan', () => {
    assert.match(fs.readFileSync(path.join(ROOT_OL, 'scripts/kb/refresh.sh'), 'utf8'), /open-leads\.js/);
  });
});
