'use strict';
/**
 * P3023 memory simulation harness: N virtual devices of mixed families, F frames each,
 * through the P3011/P3016/P3017/P3018 layers (+ P3023 layers when present).
 * Usage: node --expose-gc memory-sim.js [root] [devices=150] [frames=10000]
 * Prints JSON: heap (MB) at start / after warm-up / end, growth, per-device store bytes.
 */
const path = require('path');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const N = Number(process.argv[3] || 150);
const F = Number(process.argv[4] || 10000);
const r = (m) => require(path.join(ROOT, m));
const opt = (m) => { try { return r(m); } catch (_e) { return null; } };

function heapMB() {
  if (global.gc) { global.gc(); global.gc(); }
  return Math.round(require('v8').getHeapStatistics().used_heap_size / 1048576 * 100) / 100;
}

// deterministic PRNG
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = (a) => a[Math.floor(rnd() * a.length)];

const cat = r('lib/zigbee/data/unknown-dp-catalog.json');
const couples = Object.keys(cat.idx);
const FAMILIES = [
  { cls: 'socket', caps: ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'], battery: false },
  { cls: 'light', caps: ['onoff', 'dim'], battery: false },
  { cls: 'sensor', caps: ['measure_temperature', 'measure_humidity', 'measure_battery'], battery: true },
  { cls: 'sensor', caps: ['alarm_motion', 'measure_luminance', 'measure_battery'], battery: true },
  { cls: 'button', caps: ['measure_battery'], battery: true },
  { cls: 'thermostat', caps: ['target_temperature', 'measure_temperature'], battery: true },
  { cls: 'windowcoverings', caps: ['windowcoverings_set'], battery: false },
];

const timers = new Set();
const homey = {
  setTimeout: (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, Math.min(ms, 5)); timers.add(t); return t; },
  clearTimeout: (t) => { clearTimeout(t); timers.delete(t); },
  setInterval: (fn, ms) => { const t = setInterval(fn, ms); if (t.unref) { t.unref(); } return t; },
  clearInterval: (t) => clearInterval(t),
  flow: { getTriggerCard: () => ({ trigger: async () => true }), getConditionCard: () => null, getActionCard: () => null },
  settings: { _m: new Map(), get(k) { return this._m.get(k); }, set(k, v) { this._m.set(k, v); } },
  app: {},
  on() {},
};

function mkDevice(i) {
  const fam = FAMILIES[i % FAMILIES.length];
  const [mfr, pid] = couples[i % couples.length].split('|');
  const store = new Map();
  const caps = new Map(fam.caps.map((c) => [c, null]));
  return {
    id: `dev${i}`, _fam: fam,
    homey,
    driver: { id: `drv_${fam.cls}`, manifest: { class: fam.cls } },
    getData: () => ({ id: `dev${i}` }),
    getName: () => `Device ${i}`,
    getClass: () => fam.cls,
    getSetting: (k) => k === 'zb_manufacturer_name' ? mfr : k === 'zb_model_id' ? pid : null,
    getSettings: () => ({ zb_manufacturer_name: mfr, zb_model_id: pid }),
    getStoreValue: (k) => store.get(k),
    setStoreValue: async (k, v) => { store.set(k, v); },
    hasCapability: (c) => caps.has(c),
    getCapabilityValue: (c) => caps.get(c),
    setCapabilityValue: async (c, v) => { caps.set(c, v); },
    getCapabilities: () => [...caps.keys()],
    log: () => {}, error: () => {},
    _store: store,
  };
}

async function main() {
  const out = { root: ROOT, devices: N, frames: F };
  const Engine = r('lib/zigbee/UnknownCommandEngine');
  const Sink = r('lib/zigbee/UnknownCommandSink');
  const RFD = r('lib/zigbee/RawFrameDeduplicator');
  const Reg = r('lib/zigbee/UnsupportedRegistry');
  const Cal = r('lib/helpers/CalibrationLedger');
  const D = r('lib/zigbee/DpCatalogDecoder');
  const MC = r('lib/zigbee/MethodChain');
  const Life = opt('lib/zigbee/UnknownLifecycle');
  const Anom = opt('lib/smart/ValueAnomaly');
  const Couple = opt('lib/smart/CoupleKnowledge');
  const Budget = opt('lib/memory/MemoryBudget');
  out.p3023 = !!(Anom && Couple && Budget);

  out.heapStart = heapMB();
  const devices = [];
  for (let i = 0; i < N; i++) { const d = mkDevice(i); d._rfd = new RFD(); devices.push(d); }
  out.heapDevices = heapMB();

  let t = Date.now();
  const half = Math.floor(F / 2);
  for (let f = 0; f < F; f++) {
    for (const d of devices) {
      t += 7;
      const kind = f % 10;
      const dp = 1 + Math.floor(rnd() * 120);
      if (kind < 4) {
        Engine.handleDp(d, { dp, datatype: pick([1, 2, 4]), value: Math.floor(rnd() * 5000) }, t);
        try { D.capabilityFor(d, dp, Math.floor(rnd() * 5000)); } catch (_e) { /* */ }
      } else if (kind < 6) {
        const cmd = Math.floor(rnd() * 16);
        const data = Buffer.from([cmd, Math.floor(rnd() * 256), Math.floor(rnd() * 256), f & 0xff]);
        Engine.handleFrame(d, { clusterId: pick([6, 8, 0xEF00, 0xE000, 0xE001, 0x1888, 0xFC00]), cmdId: cmd, data, endpoint: 1 + (f % 4), tsn: f & 0xff }, t);
        d._rfd.shouldSuppress(1 + (f % 4), pick([6, 0xEF00]), { cmdId: cmd, data });
      } else if (kind === 6) {
        Sink.record(d, { clusterId: pick([0xE000, 0xE001, 0x1888, 0xFC11]) + (f % 50), cmdId: f % 40, data: Buffer.from([1, 2, 3, f & 0xff]), endpoint: 1 + (f % 3) });
      } else if (kind === 7) {
        const g = Reg.getRegistry(d);
        if (g && g.noteMissing) { g.noteMissing(`cl${f % 300}`, `attr${dp}`, 'x'); }
        Cal.mark(d, pick(d._fam.caps), rnd() * 100, rnd() * 100);
      } else if (kind === 8) {
        if (f % 50 === 8) {
          await MC.runChain(d, `read.cap${f % 90}`, [
            { name: 'zcl-native', run: async () => { if (rnd() < 0.5) { throw Object.assign(new Error('UNSUPPORTED_ATTRIBUTE'), { status: 0x86 }); } return 1; } },
            { name: 'tuya-dp', run: async () => 2 },
          ], { now: t, timeoutMs: 0 });
        }
      } else if (Anom) {
        const cap = pick(d._fam.caps);
        if (/^(measure_|meter_)/.test(cap)) { Anom.check(d, cap, rnd() * (rnd() < 0.01 ? 1e5 : 100), t); }
      }
    }
    if (f === half) { out.heapHalf = heapMB(); }
    if (f % 1000 === 0) { await new Promise((res) => setImmediate(res)); }
  }
  await new Promise((res) => setTimeout(res, 50));
  out.heapEnd = heapMB();
  out.growthSecondHalfMB = Math.round((out.heapEnd - out.heapHalf) * 100) / 100;
  out.growthTotalMB = Math.round((out.heapEnd - out.heapDevices) * 100) / 100;
  if (process.env.SIM_TRIM === '1') {
    const DT = opt('lib/memory/DeviceTrim');
    const CS = opt('lib/memory/CatalogStore');
    if (DT) { for (const d of devices) { DT.trimDevice(d); } }
    if (CS) { CS.release(); }
    out.heapAfterTrim = heapMB();
  }
  let storeBytes = 0; let maxStore = 0;
  for (const d of devices) {
    let b = 0; for (const [k, v] of d._store) { try { b += k.length + JSON.stringify(v).length; } catch (_e) { /* */ } }
    storeBytes += b; maxStore = Math.max(maxStore, b);
  }
  out.storeKBTotal = Math.round(storeBytes / 1024);
  out.storeKBMaxPerDevice = Math.round(maxStore / 1024 * 10) / 10;
  out.rfdCacheMax = Math.max(...devices.map((d) => d._rfd.cache.size));
  out.breakdownMB = {};
  const drop = (label, fn) => { const a = heapMB(); for (const d of devices) { try { fn(d); } catch (_e) { /* */ } } out.breakdownMB[label] = Math.round((a - heapMB()) * 100) / 100; };
  drop('rawFrameDedup', (d) => { d._rfd.cache.clear(); });
  drop('engine(recent/lastFlow/lastLog/lastDpVal/tsn)', (d) => { delete d._unknownEngine; });
  drop('learning(_unknownLearn)', (d) => { delete d._unknownLearn; });
  drop('sink(_unknownIncoming)', (d) => { delete d._unknownIncoming; });
  drop('unsupportedRegistry', (d) => { delete d._unsupportedRegistry; });
  drop('calibration(__calMarks)', (d) => { delete d.__calMarks; });
  drop('dpCatOwner', (d) => { delete d._dpCatOwner; });
  drop('p3023 per-device', (d) => { for (const k of Object.keys(d)) { if (/^_p3023/.test(k)) { delete d[k]; } } });
  drop('stores', (d) => { d._store.clear(); });
  out.otherKeys = [...new Set(devices.flatMap((d) => Object.keys(d).filter((k) => k.startsWith('_') && !['_fam', '_store', '_rfd'].includes(k))))];
  if (Life) { for (const d of devices) { Life.releaseDevice(d, { deleted: true }); d._rfd = null; } }
  devices.length = 0;
  out.heapAfterDelete = heapMB();
  try { const CS = opt('lib/memory/CatalogStore'); if (CS) { out.catalogStore = CS.snapshot(); CS.release(); } } catch (_e) { /* */ }
  try { const CK = opt('lib/smart/CoupleKnowledge'); if (CK) { out.coupleKnowledge = CK.shared().snapshot(0).couples; } } catch (_e) { /* */ }
  out.heapAfterSharedRelease = heapMB();
  console.log(JSON.stringify(out, null, 1));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
