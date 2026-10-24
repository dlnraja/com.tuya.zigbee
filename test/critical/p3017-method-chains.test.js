'use strict';

// P3017 — ordered method chains (native ZCL → EF00 DP → private → alt EP → poll → dataQuery →
// derived) with failover on unsupported/timeout, remembered winner, bounded backoff re-probe,
// per-device memory, never removing capabilities; coverage of the 20 methods per family.
const { describe, it } = require('node:test');
const assert = require('node:assert');

const MC = require('../../lib/zigbee/MethodChain');
const COV = require('../../lib/zigbee/MethodCoverage');
const FB = require('../../lib/zigbee/FallbackChains');

const UNSUP = () => Object.assign(new Error('UNSUPPORTED_ATTRIBUTE'), { status: 0x86 });
const TIMEOUT = () => Object.assign(new Error('Timeout: no response'), { code: 'ETIMEDOUT' });

function mkDev({ caps = {}, endpoints = {}, settings = {} } = {}) {
  const store = {};
  const removed = [];
  const added = [];
  return {
    store, removed, added, logs: [],
    zclNode: { endpoints },
    getStoreValue: (k) => store[k],
    setStoreValue: (k, v) => { store[k] = v; return Promise.resolve(); },
    getSetting: (k) => settings[k],
    hasCapability: (c) => c in caps,
    getCapabilityValue: (c) => caps[c],
    removeCapability: (c) => { removed.push(c); return Promise.resolve(); },
    addCapability: (c) => { added.push(c); return Promise.resolve(); },
    log(...a) { this.logs.push(a.join(' ')); },
  };
}

const step = (name, fn = async () => null) => ({ name, run: fn });

describe('P3017 MethodChain — order and failover', () => {
  it('orders steps by tier whatever the input order (unknown tier stays next to its predecessor)', () => {
    const o = MC.orderSteps([step('derived'), step('poll'), step('tuya-dp'), step('zcl-native'), step('magic-query'), step('alt-endpoint'), step('tuya-private')]).map((s) => s.name);
    assert.deepStrictEqual(o, ['zcl-native', 'tuya-dp', 'tuya-private', 'alt-endpoint', 'poll', 'magic-query', 'derived']);
    assert.strictEqual(MC.tierOf({ name: 'e001' }), MC.tierOf({ name: 'tuya-private' }));
  });

  it('unsupported → next method, winner remembered, demoted method skipped next run', async () => {
    const d = mkDev();
    let zclCalls = 0;
    const steps = [step('zcl-native', async () => { zclCalls++; throw UNSUP(); }), step('tuya-dp', async () => 21)];
    const r1 = await MC.runChain(d, 'read.t', steps, { now: 1000 });
    assert.strictEqual(r1.ok, true);
    assert.strictEqual(r1.via, 'tuya-dp');
    assert.deepStrictEqual(r1.failover.map((f) => f.why), ['unsupported']);
    const r2 = await MC.runChain(d, 'read.t', steps, { now: 2000 });
    assert.strictEqual(r2.via, 'tuya-dp');
    assert.strictEqual(zclCalls, 1, 'demoted step not retried inside its backoff window');
    assert.strictEqual(MC.snapshot(d)['read.t'].winner, 'tuya-dp');
  });

  it('timeout: failover each time, demotion only after MAX_TIMEOUTS', async () => {
    const d = mkDev();
    let n = 0;
    const steps = [step('zcl-native', async () => { n++; throw TIMEOUT(); }), step('poll', async () => 5)];
    await MC.runChain(d, 'read.x', steps, { now: 10 });
    assert.ok(!MC.snapshot(d)['read.x'].demoted['zcl-native'], 'one timeout does not demote');
    await MC.runChain(d, 'read.x', steps, { now: 20 });
    assert.ok(MC.snapshot(d)['read.x'].demoted['zcl-native'], 'second timeout demotes');
    await MC.runChain(d, 'read.x', steps, { now: 30 });
    assert.strictEqual(n, MC.MAX_TIMEOUTS);
  });

  it('periodic re-probe with bounded backoff, recovery returns to the better method', async () => {
    const d = mkDev();
    let zclWorks = false;
    const steps = [step('zcl-native', async () => { if (!zclWorks) { throw UNSUP(); } return 1; }), step('tuya-dp', async () => 2)];
    await MC.runChain(d, 'read.r', steps, { now: 0 });
    const until1 = MC.snapshot(d)['read.r'].demoted['zcl-native'].until;
    assert.strictEqual(until1, MC.BACKOFF_MS[0]);
    await MC.runChain(d, 'read.r', steps, { now: until1 + 1 }); // re-probe fails → longer window
    const until2 = MC.snapshot(d)['read.r'].demoted['zcl-native'].until;
    assert.strictEqual(until2 - (until1 + 1), MC.BACKOFF_MS[1]);
    zclWorks = true;
    const r = await MC.runChain(d, 'read.r', steps, { now: until2 + 1 });
    assert.strictEqual(r.via, 'zcl-native');
    assert.strictEqual(r.recovered, true);
    assert.strictEqual(MC.snapshot(d)['read.r'].winner, 'zcl-native');
    assert.ok(MC.BACKOFF_MS.every((ms) => ms <= 24 * 3600 * 1000), 'backoff bounded at 24 h');
  });

  it('all methods demoted → the earliest due one is still tried (never gives up forever)', async () => {
    const d = mkDev();
    const steps = [step('zcl-native', async () => { throw UNSUP(); }), step('tuya-dp', async () => { throw UNSUP(); })];
    await MC.runChain(d, 'read.z', steps, { now: 0 });
    const r = await MC.runChain(d, 'read.z', steps, { now: 1 });
    assert.strictEqual(r.ok, false);
    assert.ok(r.tried.length >= 1);
  });

  it('never throws, plain errors are transient (no demotion), never touches capabilities', async () => {
    const d = mkDev({ caps: { onoff: true } });
    const r = await MC.runChain(d, 'read.e', [step('zcl-native', async () => { throw new Error('boom'); })], { now: 0 });
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.transient, true);
    assert.deepStrictEqual(MC.snapshot(d)['read.e'].demoted, {});
    assert.deepStrictEqual(d.removed, []);
    assert.deepStrictEqual(d.added, []);
    const r2 = await MC.runChain(null, 'x', null);
    assert.strictEqual(r2.ok, false);
  });

  it('per-device memory is bounded (LRU) and reset works', async () => {
    const d = mkDev();
    for (let i = 0; i < 80; i++) {
      // eslint-disable-next-line no-await-in-loop
      await MC.runChain(d, `read.d${i}`, [step('poll', async () => i)], { now: i });
    }
    assert.ok(Object.keys(d.store[MC.STORE_KEY]).length <= 60);
    MC.reset(d);
    assert.deepStrictEqual(MC.snapshot(d), {});
  });

  it('per-step timeout converts a hang into failover', async () => {
    const d = mkDev();
    const r = await MC.runChain(d, 'read.h', [step('zcl-native', () => new Promise(() => {})), step('tuya-dp', async () => 7)], { now: 0, timeoutMs: 20 });
    assert.strictEqual(r.via, 'tuya-dp');
    assert.strictEqual(r.failover[0].why, 'timeout');
  });
});

describe('P3017 readSensorWithFallbacks({failover:true}) and refreshCapability', () => {
  it('named unsupported → alternate endpoint answers', async () => {
    const ep1 = { clusters: { temperatureMeasurement: { readAttributes: async () => { throw UNSUP(); } } } };
    const ep2 = { clusters: { temperatureMeasurement: { readAttributes: async () => ({ measuredValue: 2150 }) } } };
    const d = mkDev({ endpoints: { 1: ep1, 2: ep2 } });
    const r = await FB.readSensorWithFallbacks(d, ep1.clusters.temperatureMeasurement, 'temperatureMeasurement', 'measuredValue', { failover: true });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.via, 'alt-endpoint');
    assert.strictEqual(r.value, 2150);
  });

  it('magic-query (dataQuery 0x03) only runs when an EF00 cluster is present', async () => {
    let q = 0;
    const ef = { tuyaEF00Manager: { queryAllDatapoints: async () => { q++; return true; } } };
    const unsup = { readAttributes: async () => { throw UNSUP(); } };
    const zclOnly = Object.assign(mkDev({ endpoints: { 1: { clusters: { onOff: unsup } } } }), ef);
    const tuya = Object.assign(mkDev({ endpoints: { 1: { clusters: { onOff: unsup, tuya: {} } } } }), ef);
    const run = (dv) => MC.runChain(dv, 'read.m', MC.standardReadSteps(dv, { cluster: unsup, clusterLabel: 'onOff', attribute: 'onOff', endpoint: 1 }), { now: 0 });
    const a = await run(zclOnly);
    assert.strictEqual(a.ok, false);
    assert.strictEqual(q, 0);
    const b = await run(tuya);
    assert.strictEqual(b.via, 'magic-query');
    assert.strictEqual(q, 1);
  });

  it('refreshCapability: ZCL unsupported → EF00 DP requested from the couple catalog', async () => {
    const asked = [];
    const d = mkDev({
      endpoints: { 1: { clusters: { metering: { readAttributes: async () => { throw UNSUP(); } }, tuya: {} } } },
      settings: { zb_manufacturer_name: '_TZE284_6ocnqlhn', zb_model_id: 'TS0601' },
    });
    d.tuyaEF00Manager = { requestDP: async (dp) => { asked.push(dp); }, queryAllDatapoints: async () => true };
    const r = await COV.refreshCapability(d, 'meter_power', { now: 0 });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.via, 'tuya-dp');
    assert.deepStrictEqual(asked, [1]);
  });

  it('derived values: power = V × I, current = P / V; never written back', async () => {
    const d = mkDev({ caps: { measure_voltage: 230, measure_current: 0.5, measure_power: 115 } });
    assert.strictEqual(COV.DERIVED.measure_power((c) => d.getCapabilityValue(c)), 115);
    assert.strictEqual(COV.DERIVED.measure_current((c) => d.getCapabilityValue(c)), 0.5);
    const r = await COV.refreshCapability(d, 'measure_power', { now: 0 });
    assert.strictEqual(r.via, 'derived');
    assert.strictEqual(r.result, 115);
  });

  it('refreshAll runs capabilities concurrently with independent memory', async () => {
    const d = mkDev({ caps: { measure_voltage: 230, measure_current: 1 } });
    const out = await COV.refreshAll(d, ['measure_power', 'alarm_battery'], { now: 0 });
    assert.strictEqual(out.measure_power.ok, true);
    assert.strictEqual(out.alarm_battery.ok, false);
    assert.ok(MC.snapshot(d)['refresh.measure_power']);
  });

  it('legacy readSensorWithFallbacks path is unchanged without failover', async () => {
    const d = mkDev();
    const r = await FB.readSensorWithFallbacks(d, { readAttributes: async () => ({ measuredValue: 1 }) }, 'temperatureMeasurement', 'measuredValue');
    assert.strictEqual(r.ok, true);
  });
});

describe('P3017 coverage matrix — 20 methods × every family', () => {
  it('declares exactly 20 methods and every implementation exists', () => {
    assert.strictEqual(COV.METHODS.length, 20);
    const m = COV.coverageMatrix();
    for (const [fam, row] of Object.entries(m)) {
      for (const [id, st] of Object.entries(row)) { assert.notStrictEqual(st, 'missing', `${fam} × ${id}`); }
    }
  });

  it('chain, unknown and startup methods cover every family', () => {
    const m = COV.coverageMatrix();
    for (const row of Object.values(m)) {
      for (const id of COV.METHODS.filter((x) => ['chain', 'unknown', 'startup'].includes(x.group)).map((x) => x.id)) { assert.strictEqual(row[id], 'yes'); }
      assert.strictEqual(row['read.zcl_attr'], 'yes');
      assert.strictEqual(row['read.polling'], 'yes');
    }
    assert.strictEqual(m.button_remote['write.zcl_cmd_to_dp'], 'n/a', 'read-only family');
  });

  it('every family capability has a ZCL read spec or a DP name mapping', () => {
    const dpCaps = new Set(Object.values(COV.NAME_CAP));
    for (const fam of Object.values(COV.FAMILIES)) {
      for (const c of fam.caps) { assert.ok(COV.CAP_READ[c] || dpCaps.has(c) || COV.DERIVED[c] || c === 'thermostat_mode' || c === 'meter_water' || c === 'windowcoverings_state', c); }
    }
  });
});
