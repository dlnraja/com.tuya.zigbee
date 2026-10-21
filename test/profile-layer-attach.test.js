'use strict';
const assert = require('assert'); const { EventEmitter } = require('events');
const L = require('../lib/profile-engine/ProfileLayerAttach');
const TR = require('../lib/profile-engine/transition');
const G = require('../lib/profile-engine/groups');
const GEN = require('../scripts/kb/generate-profiles');
function dev({ caps = ['measure_temperature', 'measure_humidity'], settings = {}, app = {}, mfr = 'HOBEIAN', pid = 'ZG-303Z', dpMappings } = {}) {
  const set = []; const mgr = new EventEmitter();
  return { set, mgr, d: { tuyaEF00Manager: mgr, dpMappings, homey: { settings: { get: (k) => app[k] } }, getSetting: (k) => settings[k],
    getData: () => ({ manufacturerName: mfr, productId: pid }), hasCapability: (c) => caps.includes(c),
    setCapabilityValue: async (c, v) => { set.push([c, v]); }, log() {} } };
}
describe('P-KB3 profile layer', () => {
  it('fills an existing capability from a profile DP', async () => {
    const { d, mgr, set } = dev(); await L.attach(d, {}); mgr.emit('datapoint', { dp: 103, value: 215 });
    assert.deepStrictEqual(set, [['measure_temperature', 21.5]]); L.detach(d);
  });
  it('never adds a capability the device does not have', async () => {
    const { d, mgr, set } = dev({ caps: [] }); await L.attach(d, {}); mgr.emit('datapoint', { dp: 103, value: 215 }); assert.strictEqual(set.length, 0); L.detach(d);
  });
  it('leaves DPs the driver already maps to the driver', async () => {
    const { d, mgr, set } = dev({ dpMappings: { 103: {} } }); await L.attach(d, {}); mgr.emit('datapoint', { dp: 103, value: 215 }); assert.strictEqual(set.length, 0); L.detach(d);
  });
  it('device kill switch and app kill switch', async () => {
    assert.strictEqual(await L.attach(dev({ settings: { profile_engine: false } }).d, {}), null);
    assert.strictEqual(await L.attach(dev({ app: { profile_engine_off: true } }).d, {}), null);
  });
  it('unknown couple -> no layer', async () => { assert.strictEqual(await L.attach(dev({ mfr: 'X', pid: 'Y' }).d, {}), null); });
  it('filtered_attributes blocks a capability; calibration applies', async () => {
    const a = dev({ settings: { pe_filtered_attributes: 'measure_temperature' } }); await L.attach(a.d, {}); a.mgr.emit('datapoint', { dp: 103, value: 215 }); assert.strictEqual(a.set.length, 0); L.detach(a.d);
    const b = dev({ settings: { measure_temperature_calibration: -1 } }); await L.attach(b.d, {}); b.mgr.emit('datapoint', { dp: 103, value: 215 }); assert.deepStrictEqual(b.set, [['measure_temperature', 20.5]]); L.detach(b.d);
  });
  it('options are bounded and default off', () => {
    assert.deepStrictEqual(L.optionsFor({ getSetting: () => undefined }), { debounceMs: 0, throttleMs: 0, filtered: [], optimistic: false });
    assert.strictEqual(L.optionsFor({ getSetting: (k) => (k === 'pe_debounce_ms' ? 9e9 : undefined) }).debounceMs, 600000);
  });
  it('detach removes the listener', async () => { const { d, mgr } = dev(); await L.attach(d, {}); L.detach(d); assert.strictEqual(mgr.listenerCount('datapoint'), 0); });
});
describe('P-KB3 transition + groups + generator', () => {
  it('transition only when configured, never overrides caller', () => {
    assert.deepStrictEqual(TR.withTransition({ getSetting: () => undefined }, { level: 1 }), { level: 1 });
    assert.deepStrictEqual(TR.withTransition({ getSetting: () => 500 }, { level: 1 }), { level: 1, transitionTime: 5 });
    assert.deepStrictEqual(TR.withTransition({ getSetting: () => 500 }, { level: 1, transitionTime: 0 }), { level: 1, transitionTime: 0 });
  });
  it('group ids parsed and bounded; addGroup called', async () => {
    assert.deepStrictEqual(G.parseGroupIds('3, 3,0,70000,abc,12'), [3, 12]);
    const calls = []; const r = await G.applyGroups({ getSetting: () => '5' }, { endpoints: { 1: { clusters: { groups: { addGroup: async (a) => calls.push(a.groupId) } } } } });
    assert.deepStrictEqual(r.added, [5]); assert.deepStrictEqual(calls, [5]);
    assert.deepStrictEqual((await G.applyGroups({ getSetting: () => '' }, {})).added, []);
  });
  it('generator keeps only exact single-driver couples, strips padding, no DP guessing', () => {
    const by = new Map([['_tz3000_a|ts0201', new Set(['s'])], ['_tz3000_b|ts0201', new Set(['s', 't'])]]);
    const out = GEN.generate({ '_TZ3000_a\u0000|TS0201': [['z2m', 'M', 'u']], '_TZ3000_b|TS0201': [], 'c|d': [] }, by);
    assert.strictEqual(out.length, 1); assert.strictEqual(out[0].driver, 's'); assert.deepStrictEqual(out[0].dps, {}); assert.strictEqual(out[0].source.url, 'u');
  });
});
