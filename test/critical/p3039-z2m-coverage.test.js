'use strict';
// P3039: multi-source Tuya coverage matrix (scripts/kb/z2m-coverage.js + scripts/kb/coverage-sources.js).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const S = require('../../scripts/kb/coverage-sources');
const M = require('../../scripts/kb/z2m-coverage');

const ROOT = path.resolve(__dirname, '../..');

function mirror() {
  const kb = fs.mkdtempSync(path.join(os.tmpdir(), 'p3039-kb-'));
  const w = (rel, txt) => { fs.mkdirSync(path.dirname(path.join(kb, rel)), { recursive: true }); fs.writeFileSync(path.join(kb, rel), txt); };
  w('hubitat/Drivers/x.groovy', 'fingerprint profileId:"0104", model:"TS0601", manufacturer:"_TZE200_aaaa0001", deviceJoinName: "x"\n'
    + "  [profileId:'0104', model:'TS0601', manufacturer:'_TZE204_bbbb0002', deviceJoinName: 'y'],\n"
    + "  [profileId:'0104', model:'lumi.x', manufacturer:'Aqara']\n  ['_TZE200_cccc0003'] // no model: never a couple\n");
  w('domoticz-cert/Certified/Tuya/Some Model.json', JSON.stringify({ Identifier: [['TS0601', '_TZE200_dddd0004'], ['TS0601']] }));
  w('tasmota/tasmota/zigbee/x.zb', ':TS0601,_TZE284_eeee0005\nEF00/0201,Temp\n:*,*\n');
  w('blakadder/_zigbee/a.md', "---\nmodel: A\nzigbeemodel: ['TS0001','_TZ3000_ffff0006']\n---\n");
  w('blakadder/_zigbee/b.md', "---\nmodel: B\nzigbeemodel: ['TS0001','TS0011','_TZ3000_gggg0007']\n---\n");
  w('smartthings/drivers/tuya/fingerprints.yml', 'zigbeeManufacturer:\n  - id: "a"\n    deviceLabel: x\n    manufacturer: _TZ3000_hhhh0008\n    model: TS0201\n    deviceProfileName: p\n');
  w('deconz/devices/tuya/x.json', JSON.stringify({ manufacturername: ['_TZE200_iiii0009', '_TZE200_jjjj0010'], modelid: ['TS0601', 'TS0601'], product: 'P' }));
  w('johan/drivers/t/driver.compose.json', JSON.stringify({ class: 'sensor', zigbee: { manufacturerName: ['_TZ3000_kkkk0011'], productId: ['TS0201', 'TS0203'] } }));
  w('zha/zhaquirks/tuya/x.py', 'MODELS_INFO: [("_TZE200_llll0012", "TS0601")]\n(\n  TuyaQuirkBuilder("_TZE204_mmmm0013", "TS0601")\n)\n');
  return kb;
}
const by = (name, kb) => S.ADAPTERS.find(([n]) => n === name)[1](kb, {});
const keys = (r) => r.entries.map((e) => `${e.mfr}|${e.pid}`).sort();

describe('P3039 coverage adapters (exact couples only)', () => {
  const kb = mirror();
  it('hubitat reads fingerprint lines and profile maps, never a bare manufacturer', () => {
    assert.deepStrictEqual(keys(by('hubitat', kb)).filter((k) => k.startsWith('_T')), ['_TZE200_aaaa0001|TS0601', '_TZE204_bbbb0002|TS0601']);
  });
  it('domoticz Identifier is [pid, mfr]; incomplete pairs are skipped (file names with spaces ok)', () => {
    assert.deepStrictEqual(keys(by('domoticz', kb)), ['_TZE200_dddd0004|TS0601']);
  });
  it('tasmota .zb ":pid,mfr" lines, wildcards skipped', () => {
    assert.deepStrictEqual(keys(by('tasmota', kb)), ['_TZE284_eeee0005|TS0601']);
  });
  it('blakadder forms a couple only when exactly one model id is listed', () => {
    const r = by('blakadder', kb);
    assert.deepStrictEqual(keys(r), ['_TZ3000_ffff0006|TS0001']);
    assert.strictEqual(r.meta.ambiguousSkipped, 1);
  });
  it('smartthings fingerprints.yml, deconz index pairing, johan cross product, zha tuples and builder', () => {
    assert.deepStrictEqual(keys(by('smartthings', kb)), ['_TZ3000_hhhh0008|TS0201']);
    assert.deepStrictEqual(keys(by('deconz', kb)), ['_TZE200_iiii0009|TS0601', '_TZE200_jjjj0010|TS0601']);
    assert.deepStrictEqual(keys(by('johan', kb)), ['_TZ3000_kkkk0011|TS0201', '_TZ3000_kkkk0011|TS0203']);
    assert.deepStrictEqual([...new Set(keys(by('zha', kb)))], ['_TZE200_llll0012|TS0601', '_TZE204_mmmm0013|TS0601']);
  });
  it('missing mirrors are reported, not thrown', () => {
    const r = by('iobroker', kb);
    assert.strictEqual(r.missing, true);
    assert.strictEqual(by('z2m', kb).missing, true);
  });
  it('Tuya scope: OEM manufacturer ids or TSxxxx product ids', () => {
    assert.ok(S.isTuya('_TZE284_x', 'TS0601'));
    assert.ok(S.isTuya('_TYZB01_x', 'RH3040'));
    assert.ok(S.isTuya('Moes', 'TS0601'));
    assert.ok(!S.isTuya('IKEA of Sweden', 'TRADFRI bulb'));
  });
  it('Wi-Fi/LAN projects are leads only (separate matrix)', () => {
    assert.deepStrictEqual(S.WIFI_LEADS, ['tuya-local', 'localtuya', 'tinytuya', 'esphome']);
  });
});

describe('P3039 classification rules', () => {
  it('Z2M expose trees flatten to names', () => {
    const n = S.exposeNames([{ type: 'climate', features: [{ name: 'current_heating_setpoint' }, { name: 'local_temperature' }] }, { name: 'battery', property: 'battery' }]);
    assert.deepStrictEqual(n, ['battery', 'climate', 'current_heating_setpoint', 'local_temperature']);
  });
  it('class check: climate needs a thermostat-like class, sensors never land on actuators', () => {
    assert.strictEqual(M.classOk('thermostat', M.expectedClasses(['climate'])), true);
    assert.strictEqual(M.classOk('sensor', M.expectedClasses(['climate'])), false);
    assert.strictEqual(M.classOk('socket', M.expectedClasses(['smoke', 'battery'])), false);
    assert.strictEqual(M.classOk('sensor', M.expectedClasses(['smoke', 'battery'])), true);
    assert.strictEqual(M.classOk('fan', M.expectedClasses(['fan', 'light'])), true);
    assert.strictEqual(M.classOk('sensor', M.expectedClasses(['occupancy', 'light'])), true);
    assert.strictEqual(M.expectedClasses(['linkquality']), null);
  });
  it('missing capabilities: standard Homey caps only, sub-capabilities count as present', () => {
    assert.deepStrictEqual(M.missingCaps(['temperature', 'humidity', 'battery'], ['measure_temperature.inside', 'measure_battery']), ['measure_humidity']);
    assert.deepStrictEqual(M.missingCaps(['state', 'current_heating_setpoint'], ['target_temperature']), []);
    assert.deepStrictEqual(M.missingCaps(['some_custom_setting'], []), []);
  });
  it('branch index is caseless (mfr lower, PID upper) like the runtime', () => {
    const r = M.readBranch(ROOT);
    assert.ok(r.idx.size > 1000);
    for (const k of [...r.idx.keys()].slice(0, 200)) { const [m, p] = k.split('|'); assert.strictEqual(m, m.toLowerCase()); assert.strictEqual(p, p.toUpperCase()); }
  });
});

describe('P3039 wiring', () => {
  it('refresh.sh runs the matrix and the KB workflow commits its report', () => {
    const sh = fs.readFileSync(path.join(ROOT, 'scripts/kb/refresh.sh'), 'utf8');
    assert.match(sh, /z2m-coverage\.js/);
    for (const m of ['hubitat', 'smartthings', 'st-mariano', 'iobroker', 'domoticz-cert', 'tasmota']) { assert.ok(sh.includes(`[${m}]=`) || sh.includes(`$KB_DIR/${m}`), m); }
    assert.ok(!/npm i[^\n]*--save/.test(sh), 'herdsman package must not enter the app package.json');
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/kb-refresh.yml'), 'utf8');
    assert.match(wf, /docs\/knowledge\/Z2M_COVERAGE\.md/);
  });
  it('committed matrix has the five statuses for every branch and per-source counts', () => {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/kb/z2m-coverage.json'), 'utf8'));
    assert.strictEqual(j.schema, 1);
    for (const b of ['master', 'stable-v5', 'bastien-home']) {
      const c = j.summary.all[b];
      assert.ok(c && c.total > 0, b);
      assert.strictEqual(M.STATUSES.reduce((a, s) => a + c[s], 0), c.total);
    }
    for (const s of ['z2m', 'zha', 'deconz', 'johan', 'blakadder', 'hubitat', 'smartthings', 'domoticz', 'tasmota']) { assert.ok(j.sources[s], s); }
    for (const r of j.rows.slice(0, 50)) { assert.ok(r.s.length > 0 && j.src[r.k], r.k); }
  });
});
