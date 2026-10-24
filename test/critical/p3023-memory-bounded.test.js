'use strict';
/**
 * P3023 CI guard: per-device state must plateau. A small in-process copy of
 * tools/perf/p3023-memory-sim.js (12 devices × 3000 mixed frames) counts every
 * Map/Set/Array entry hanging off the device and fails if the count keeps growing
 * after warm-up (unbounded cache / log / queue) or exceeds the documented caps.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const Engine = require('../../lib/zigbee/UnknownCommandEngine');
const Sink = require('../../lib/zigbee/UnknownCommandSink');
const RFD = require('../../lib/zigbee/RawFrameDeduplicator');
const Reg = require('../../lib/zigbee/UnsupportedRegistry');
const MC = require('../../lib/zigbee/MethodChain');
const VA = require('../../lib/smart/ValueAnomaly');
const Life = require('../../lib/zigbee/UnknownLifecycle');
const DT = require('../../lib/memory/DeviceTrim');
const CK = require('../../lib/smart/CoupleKnowledge');

let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = (a) => a[Math.floor(rnd() * a.length)];

const homey = {
  setTimeout: (fn, ms) => { const t = setTimeout(fn, Math.min(ms, 1)); if (t.unref) { t.unref(); } return t; },
  clearTimeout: (t) => clearTimeout(t),
  setInterval: () => null, clearInterval: () => {},
  flow: { getTriggerCard: () => ({ trigger: async () => true }), getConditionCard: () => null, getActionCard: () => null },
  settings: { _m: new Map(), get(k) { return this._m.get(k); }, set(k, v) { this._m.set(k, v); } },
  app: {}, on() {},
};

function mkDevice(i) {
  const store = new Map();
  const caps = new Map(['onoff', 'measure_power', 'measure_temperature', 'measure_humidity'].map((c) => [c, null]));
  return {
    homey, driver: { id: 'drv', manifest: { class: 'socket' } },
    getData: () => ({ id: `d${i}` }), getName: () => `D${i}`, getClass: () => 'socket',
    getSetting: (k) => k === 'zb_manufacturer_name' ? `_TZ3000_sim${i % 3}` : k === 'zb_model_id' ? 'TS011F' : null,
    getSettings: () => ({}),
    getStoreValue: (k) => store.get(k), setStoreValue: async (k, v) => { store.set(k, v); },
    hasCapability: (c) => caps.has(c), getCapabilityValue: (c) => caps.get(c), setCapabilityValue: async (c, v) => { caps.set(c, v); },
    getCapabilities: () => [...caps.keys()], log: () => {}, error: () => {},
    _rfd: new RFD(),
  };
}

/** Count entries of every Map / Set / Array reachable from device._* (depth ≤ 4). */
function entries(device) {
  let n = 0;
  const seen = new Set();
  const walk = (v, depth) => {
    if (!v || typeof v !== 'object' || seen.has(v) || depth > 4 || Buffer.isBuffer(v)) { return; }
    seen.add(v);
    if (v instanceof Map) { n += v.size; for (const x of v.values()) { walk(x, depth + 1); } return; }
    if (v instanceof Set) { n += v.size; return; }
    if (Array.isArray(v)) { n += v.length; for (const x of v) { walk(x, depth + 1); } return; }
    for (const k of Object.keys(v)) { if (k !== 'homey' && k !== 'driver') { n += 1; walk(v[k], depth + 1); } }
  };
  for (const k of Object.keys(device)) { if (k.startsWith('_')) { walk(device[k], 0); } }
  return n;
}

async function drive(devices, from, to, clock) {
  for (let f = from; f < to; f++) {
    for (const d of devices) {
      clock.t += 7;
      const kind = f % 10;
      const dp = 1 + Math.floor(rnd() * 120);
      if (kind < 4) {
        Engine.handleDp(d, { dp, datatype: pick([1, 2, 4]), value: Math.floor(rnd() * 5000) }, clock.t);
      } else if (kind < 6) {
        const cmd = Math.floor(rnd() * 16);
        const data = Buffer.from([cmd, Math.floor(rnd() * 256), Math.floor(rnd() * 256), f & 0xff]);
        Engine.handleFrame(d, { clusterId: pick([6, 8, 0xEF00, 0xE000, 0x1888]), cmdId: cmd, data, endpoint: 1 + (f % 4), tsn: f & 0xff }, clock.t);
        d._rfd.shouldSuppress(1 + (f % 4), pick([6, 0xEF00]), { cmdId: cmd, data });
      } else if (kind === 6) {
        Sink.record(d, { clusterId: 0xE000 + (f % 50), cmdId: f % 40, data: Buffer.from([1, 2, f & 0xff]), endpoint: 1 });
      } else if (kind === 7) {
        const g = Reg.getRegistry(d);
        if (g && g.noteMissing) { g.noteMissing(`cl${f % 300}`, `attr${dp}`, 'x'); }
      } else if (kind === 8 && f % 50 === 8) {
        await MC.runChain(d, `read.cap${f % 90}`, [
          { name: 'zcl-native', run: async () => { if (rnd() < 0.5) { throw Object.assign(new Error('UNSUPPORTED_ATTRIBUTE'), { status: 0x86 }); } return 1; } },
          { name: 'tuya-dp', run: async () => 2 },
        ], { now: clock.t, timeoutMs: 0 });
      } else if (kind === 9) {
        VA.check(d, pick(['measure_power', 'measure_temperature', 'measure_humidity']), rnd() * (rnd() < 0.01 ? 1e5 : 100), clock.t);
      }
    }
  }
}

describe('P3023 memory: per-device state plateaus under sustained traffic', () => {
  it('entry count after 3000 frames is not above the count after 1500 (+5 %), with absolute caps', async () => {
    const devices = Array.from({ length: 12 }, (_, i) => mkDevice(i));
    const clock = { t: Date.now() };
    await drive(devices, 0, 1500, clock);
    const mid = devices.map(entries);
    await drive(devices, 1500, 3000, clock);
    const end = devices.map(entries);
    if (process.env.P3023_DEBUG) { console.log(JSON.stringify({ mid, end })); }
    for (let i = 0; i < devices.length; i++) {
      assert.ok(end[i] <= Math.ceil(mid[i] * 1.05) + 8, `device ${i} grew ${mid[i]} → ${end[i]}`);
      assert.ok(end[i] < 6000, `device ${i} holds ${end[i]} entries`);
      assert.ok(devices[i]._rfd.cache.size <= 128);
      assert.ok(Sink.recent(devices[i]).length <= Sink.RING_MAX);
    }
    // degradation path (MemoryBudget "high") shrinks every device
    for (const d of devices) { DT.trimDevice(d); }
    const trimmed = devices.map(entries);
    for (let i = 0; i < devices.length; i++) { assert.ok(trimmed[i] < end[i], `trim did not shrink device ${i}`); }
    // deletion leaves no per-device P3023 / engine state behind
    for (const d of devices) { Life.releaseDevice(d, { deleted: true }); }
    for (const d of devices) { assert.ok(!d._p3023anomaly && !d._methodChainSt, Object.keys(d).join(',')); }
    assert.ok(CK.shared().snapshot(0).couples <= CK.MAX_COUPLES);
    CK._resetShared();
  });
});
