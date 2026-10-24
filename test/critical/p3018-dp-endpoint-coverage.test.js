'use strict';
// WHY: the critical suite also runs these files with `node --test` (no mocha globals) — same as p3017.
const { describe, it } = require('node:test');

// P3018 — every DP and every endpoint handled: Z2M tuyaDatapoints harvest (names + converters),
// catalogue v2, exact decoder with guards, interpreter exact values, passive endpoint coverage
// (no cross-gang, EP242 ignored, zero TX), per-device coverage, static audit + duplicate gate.
// mocha globals (describe/it) — failures gate `npm test`.
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');
const Module = require('module');

const ROOT = path.join(__dirname, '..', '..');
const H = require('../../scripts/data/harvest-z2m-tuya-dps');
const D = require('../../lib/zigbee/DpCatalogDecoder');
const I = require('../../lib/zigbee/UnknownCommandInterpreter');
const EC = require('../../lib/zigbee/EndpointCoverage');
const MC = require('../../lib/zigbee/MethodCoverage');
const AUD = require('../../scripts/kb/dp-endpoint-coverage');
const { build } = require('../../scripts/data/build-unknown-dp-catalog');

const COUPLE = { zb_manufacturer_name: '_TZE284_hodyryli', zb_model_id: 'TS0601' }; // DP1 temperature ÷10
function mkDev({ settings = COUPLE, caps = [], dpMappings = {}, store = {} } = {}) {
  const set = [];
  return {
    id: 'd', set, store, dpMappings, homey: { manifest: { flow: {} }, flow: {}, setTimeout, clearTimeout },
    driver: { id: 'climate_sensor' }, getData: () => ({ id: 'd' }), getName: () => 'x', getClass: () => 'sensor',
    getSetting: (k) => settings[k], getStoreValue: (k) => store[k], setStoreValue: (k, v) => { store[k] = v; return Promise.resolve(); },
    hasCapability: (c) => caps.includes(c), safeSetCapabilityValue: (c, v) => { set.push([c, v]); return Promise.resolve(); }, log() {}, error() {},
  };
}

describe('P3018 harvester (Z2M tuyaDatapoints)', () => {
  it('parses every fingerprint couple of a definition with DP name + converter token', () => {
    const src = "const definitions = [{ fingerprint: tuya.fingerprint('TS0601', ['_TZE200_aaaa1111','_TZE204_bbbb2222']), model: 'X', vendor: 'Y', meta: { tuyaDatapoints: [[1, 'temperature', tuya.valueConverter.divideBy10], [9, 'mode', tuya.valueConverterBasic.lookup({auto: tuya.enum(0), manual: tuya.enum(1)})]] } }];";
    const m = H.parseDefinitions(src);
    assert.deepStrictEqual([...m.keys()].sort(), ['_TZE200_aaaa1111|TS0601', '_TZE204_bbbb2222|TS0601']);
    const rows = m.get('_TZE200_aaaa1111|TS0601');
    assert.deepStrictEqual(rows.get(1), ['temperature', 'div:10']);
    assert.match(rows.get(9)[1], /^lookup:/);
  });
  it('maps converters to tokens; unknown named converters stay "other:" (dropped from the catalogue)', () => {
    assert.strictEqual(H.convToken('tuya.valueConverter.divideBy100'), 'div:100');
    assert.strictEqual(H.convToken('tuya.valueConverter.trueFalse1'), 'tf:1');
    assert.strictEqual(H.convToken('tuya.valueConverter.raw'), 'raw');
    assert.match(H.convToken('tuya.valueConverter.somethingCustom'), /^other:/);
  });
  it('ZHA quirk DP numbers per couple (KB index) — numbers only, bounded, sorted', () => {
    const f = path.join(os.tmpdir(), `p3018-zha-${process.pid}.json`);
    fs.writeFileSync(f, JSON.stringify([{ fingerprints: [{ mfr: '_TZE200_zzzz9999', pid: 'TS0601' }], dps: [13, 1, 999, 1], cite: { commit: 'abc' } }]));
    const z = H.harvestZha(f);
    fs.unlinkSync(f);
    assert.deepStrictEqual(z.couples['_TZE200_zzzz9999|TS0601'], [1, 13]);
    assert.strictEqual(H.harvestZha('/nonexistent/x.json'), null);
  });
  it('committed harvest data is present and credited', () => {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/z2m-tuya-dps.json'), 'utf8'));
    assert.ok(Object.keys(j.couples).length > 1000);
    assert.ok(j.commit && j.src);
    const credits = fs.readFileSync(path.join(ROOT, 'docs/knowledge/KB_SOURCES.md'), 'utf8');
    assert.match(credits, /P3018/);
  });
});

describe('P3018 catalogue v2 + exact decoder', () => {
  it('catalogue carries converter tokens per couple (caseless lookup)', () => {
    const e = D.entry('_tze284_HODYRYLI', 'ts0601', 1);
    assert.strictEqual(e.conv, 'div:10');
    assert.ok(D.coupleDps('_TZE284_hodyryli', 'TS0601').length >= 2);
  });
  it('decode() follows Z2M valueConverter semantics', () => {
    assert.deepStrictEqual(D.decode('div:10', 231), { value: 23.1 });
    assert.deepStrictEqual(D.decode('tf:1', 1), { value: true });
    assert.deepStrictEqual(D.decode('inv', true), { value: false });
    assert.deepStrictEqual(D.decode('power', 0x1999999c - 5), { value: -5 });
    assert.deepStrictEqual(D.decode('twos8:1', 250), { value: -6 });
    assert.deepStrictEqual(D.decode('scale:0,100,0,1000', 500), { value: 50 });
    assert.deepStrictEqual(D.decode('plus1', 2), { value: 3 });
    assert.deepStrictEqual(D.decode('lookup:{"0":"auto","1":"manual"}', 1), { value: 'manual' });
    assert.strictEqual(D.decode('bogus', 1), null);
  });
  it('build(): upstream converter kept only when the knowledge name means the same thing', () => {
    const tuyaDps = { date: 'x', couples: { '_TZE200_t1|TS0601': [[1, 'temperature', 'div:10'], [2, 'humidity', 'raw']] } };
    const knowledge = { couples: { '_TZE200_t1|TS0601': { dps: { 1: { name: 'measure_temperature', capability: 'measure_temperature' }, 2: { name: 'sensitivity' } } } } };
    const c = build({ z2m: null, knowledge, tuyaDps });
    const key = '_tze200_t1|TS0601';
    const prof = c.profiles[c.idx[key]];
    const cv = c.cv[c.idx[key]];
    const conv = (dp) => { for (let i = 0; i < prof.length; i += 2) { if (prof[i] === dp) { const ci = cv[i / 2]; return ci >= 0 ? c.convs[ci] : null; } } return undefined; };
    assert.strictEqual(conv(1), 'div:10');
    assert.strictEqual(conv(2), null); // meaning changed (humidity → sensitivity): converter dropped
  });
  it('capabilityFor(): applies an exact measurement, with every guard', () => {
    D._resetForTests();
    const ok = D.capabilityFor(mkDev({ caps: ['measure_temperature'] }), 1, 231);
    assert.strictEqual(ok.capability, 'measure_temperature');
    assert.strictEqual(ok.value, 23.1);
    assert.strictEqual(D.capabilityFor(mkDev({ caps: [] }), 1, 231).reason, 'capability-absent');
    assert.strictEqual(D.capabilityFor(mkDev({ caps: ['measure_temperature'], dpMappings: { 9: { capability: 'measure_temperature' } } }), 1, 231).reason, 'driver-owns-capability');
    assert.strictEqual(D.capabilityFor(mkDev({ caps: ['measure_temperature'] }), 1, 99999).reason, 'out-of-range');
    assert.strictEqual(D.capabilityFor(mkDev({ caps: ['measure_battery'] }), 3, 80).capability, null); // battery never auto-applied
    assert.strictEqual(D.capabilityFor(mkDev({ caps: ['measure_temperature'] }), 250, 1), null); // unknown DP
    class Custom { _handleDP(dp) { switch (dp) { case 1: return 1; default: return 0; } } }
    const dev = Object.assign(Object.create(Custom.prototype), mkDev({ caps: ['measure_temperature'] }));
    assert.strictEqual(D.capabilityFor(dev, 1, 231).reason, 'driver-handles-dp');
    const one = mkDev({ caps: ['measure_temperature'] });
    one._dpCatOwner = new Map([['measure_temperature', 38]]);
    assert.strictEqual(D.capabilityFor(one, 1, 231).reason, 'capability-owned-by-other-dp');
  });
  it('heuristicAllowed(): vetoes only guesses that contradict the catalogue', () => {
    const dev = mkDev();
    assert.strictEqual(D.heuristicAllowed(dev, 1, 'measure_temperature'), true);
    assert.strictEqual(D.heuristicAllowed(dev, 1, 'measure_humidity'), false);
    assert.strictEqual(D.heuristicAllowed(dev, 3, 'measure_battery'), true); // battery guess kept
    assert.strictEqual(D.heuristicAllowed(dev, 200, 'measure_humidity'), true); // unknown DP → old behaviour
  });
  it('interpreter returns the exact converted value with the converter as source', () => {
    const r = I.interpretDp({ dp: 1, datatype: 2, value: 231, mfr: '_TZE284_hodyryli', pid: 'TS0601' });
    assert.strictEqual(r.value, 23.1);
    assert.strictEqual(r.exact, true);
    assert.match(r.source, /div:10/);
  });
});

function cluster(id) {
  const c = new EventEmitter();
  c.constructor = { ID: id };
  for (const m of ['readAttributes', 'writeAttributes', 'configureReporting', 'bind', 'setOn', 'setOff', 'toggle']) { c[m] = () => { throw new Error(`TX ${m}`); }; }
  return c;
}

describe('P3018 endpoint coverage (passive, per endpoint)', () => {
  it('candidates(): main EP → root, EP N → its own gang names only', () => {
    assert.deepStrictEqual(EC.candidates('onoff', 1, 1), ['onoff']);
    assert.deepStrictEqual(EC.candidates('onoff', 2, 1), ['onoff.gang2', 'onoff.2', 'onoff.channel2', 'onoff.socket2']);
  });
  it('attach(): routes EP2 to onoff.gang2, never EP1 root; unknown EP → exposed; EP242 ignored; zero TX; idempotent', async () => {
    const ep1 = { clusters: { onOff: cluster(6), basic: cluster(0) } };
    ep1.clusters.onOff.on('attr.onOff', () => {}); // driver already listens on EP1
    const ep2 = { clusters: { onOff: cluster(6) } };
    const ep3 = { clusters: { onOff: cluster(6), temperatureMeasurement: cluster(0x402) } };
    const gp = { clusters: { greenPower: cluster(0x21) } };
    const zclNode = { endpoints: { 1: ep1, 2: ep2, 3: ep3, 242: gp } };
    const dev = mkDev({ caps: ['onoff', 'onoff.gang2'] });
    const st = EC.attach(dev, zclNode);
    assert.strictEqual(st.gp, true);
    assert.strictEqual(ep1.clusters.onOff.listenerCount('attr.onOff'), 1); // not doubled
    ep2.clusters.onOff.emit('attr.onOff', true);
    ep3.clusters.onOff.emit('attr.onOff', false);
    ep3.clusters.temperatureMeasurement.emit('attr.measuredValue', 2150);
    assert.deepStrictEqual(dev.set, [['onoff.gang2', true]]);
    const snap = EC.snapshot(dev);
    assert.ok(snap.unrouted['ep3.onOff.onOff']);
    assert.ok(snap.unrouted['ep3.temperatureMeasurement.measuredValue']);
    assert.deepStrictEqual(Object.keys(dev.store.endpoint_inventory.eps), ['1', '2', '3']);
    assert.strictEqual(EC.attach(dev, zclNode), st);
    assert.strictEqual(ep2.clusters.onOff.listenerCount('attr.onOff'), 1);
  });
  it('attach(): DP-owned root capability on the main EP is left to the DP path', () => {
    const ep1 = { clusters: { onOff: cluster(6) } };
    const dev = mkDev({ caps: ['onoff'], dpMappings: { 1: { capability: 'onoff' } } });
    EC.attach(dev, { endpoints: { 1: ep1 } });
    assert.strictEqual(ep1.clusters.onOff.listenerCount('attr.onOff'), 0);
  });
  it('ZCL scaling: temperature /100, invalid 0x8000 ignored, illuminance log scale', () => {
    const t = EC.ROUTES.temperatureMeasurement[0][2];
    assert.strictEqual(t(2150), 21.5);
    assert.strictEqual(t(-32768), undefined);
    assert.strictEqual(EC.ROUTES.illuminanceMeasurement[0][2](10001), 10);
  });
});

describe('P3018 coverage (runtime + static audit)', () => {
  it('MethodCoverage.dpCoverage(): driver / exact / generic per couple', () => {
    const cov = MC.dpCoverage(mkDev({ dpMappings: { 2: { capability: 'measure_humidity' } } }));
    assert.ok(cov.driver.includes(2));
    assert.ok(cov.exact.some((x) => x.startsWith('1:')));
    assert.ok(cov.generic.some((x) => x.startsWith('3:')));
    assert.ok(MC.endpointCoverage(mkDev()).hasOwnProperty('inventory'));
  });
  it('static audit parses dpMappings keys, duplicates and handler DPs', () => {
    const r = AUD.dpMappingKeys("get dpMappings() { return { 1: {a:1}, '2': {b:2}, 1: {c:3} }; }");
    assert.deepStrictEqual([...r.dps].sort(), [1, 2]);
    assert.strictEqual(r.dups.length, 1);
    assert.deepStrictEqual([...AUD.handlerDps('switch (dp) { case 4: break; case 105: break; } if (dpId === 7) {}')].sort((a, b) => a - b), [4, 7, 105]);
  });
  it('gate: no duplicate numeric key in any object literal (drivers + lib)', () => {
    const d = AUD.duplicateKeys();
    if (!d.skipped) { assert.deepStrictEqual(d.hits, []); }
  });
  it('generated doc exists', () => {
    const md = fs.readFileSync(path.join(ROOT, 'docs/knowledge/KB/DP_ENDPOINT_COVERAGE.md'), 'utf8');
    assert.match(md, /^# DP \+ endpoint coverage \(P3018\)/);
  });
});

describe('P3018 fixes', () => {
  it('air_purifier_soil DP5 divides (was multiplying 231 → 2310 °C)', () => {
    const cacheBefore = new Set(Object.keys(require.cache));
    const orig = Module._load;
    Module._load = function load(request, parent, isMain) {
      if (request === 'homey') { return { Device: class {}, Driver: class {}, SimpleClass: class {} }; }
      if (request === 'homey-zigbeedriver') { return { ZigBeeDevice: class {}, ZigBeeDriver: class {} }; }
      return orig.call(this, request, parent, isMain);
    };
    let S;
    try { S = require('../../drivers/air_purifier_soil/device'); } finally {
      Module._load = orig;
      for (const k of Object.keys(require.cache)) { if (!cacheBefore.has(k)) { delete require.cache[k]; } }
    }
    assert.strictEqual(S.soilTemperature(231), 23.1);
    assert.strictEqual(S.soilTemperature(2310), 23.1);
    assert.strictEqual(S.soilTemperature(22), 22);
    assert.strictEqual(S.soilTemperature('x'), null);
  });
});
