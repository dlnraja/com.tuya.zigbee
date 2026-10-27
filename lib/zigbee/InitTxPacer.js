'use strict';
/*
 * P3040 — first-start / pairing TX pacer.
 *
 * WHY: the pairing trace (scripts/perf/pairing-trace.js) showed that during the first seconds
 * after onNodeInit several layers ask the device the same thing at the same moment: the Tuya
 * magic-packet basic read twice, mcuVersionRequest/dataQuery from 3-4 managers within 200 ms,
 * IAS CIE reads repeated every 2 s. That is 12-18 radio requests in one second per device,
 * and the same burst for every device at app start (route-discovery storms after a router
 * change, forum 154959 Anders_Bee).
 *
 * WHAT (init window only, default 180 s after attach; afterwards every call passes straight through):
 *   - identical requests (same endpoint, cluster, method, arguments) started within dedupeMs
 *     share one radio request and one result;
 *   - basic-cluster attributes read once are served from a small cache (zclVersion, appVersion,
 *     manufacturerName, modelId, powerSource...), cleared on rejoin so the magic packet still
 *     goes out after a power cut;
 *   - request starts are spaced (burst of 3, then mains 80 ms, battery 150 ms per device, 20 ms app-wide), never
 *     serialised on the answer, so a sleeping device cannot stall the queue;
 *   - counts and timings are kept as pairing metrics (no IEEE, no name).
 * Writes and user commands (onoff, levels, Tuya datapoint writes) are never wrapped, except
 * basic-cluster writes (only the magic-packet attribute 0xFFDE lives there), which were sent
 * two or three times at 0 ms.
 * Bounded: dedupe map 64 entries, basic cache 24 attributes, at most 64 paced starts waiting
 * (overflow runs directly), max spacing delay 5 s. Kill switch: app setting
 * `init_tx_pacer_disabled` = true, or device setting `init_tx_pacer` = false.
 *
 * L-P3040-03 (sleepy restart): a battery end device is asleep when the app restarts, so the
 * reads/binds/queries sent at start mostly time out and get retried. On a restart (never on the
 * first init after pairing, when the device is still awake) the wrapped requests of a battery
 * device wait for the first frame received from it, then go out paced as before. The wait is
 * capped (deferMaxMs, default 120 s): if nothing arrives the requests leave exactly as before.
 * User commands and datapoint writes are never wrapped, so never delayed. At most 64 waiting
 * requests (overflow goes straight to pacing). Kill switch: device setting `init_tx_defer_rx`
 * = false, or app setting `init_tx_pacer_disabled`.
 */

const WRAPPED_ZCL = new Set(['readAttributes', 'bind', 'configureReporting', 'discoverAttributes', 'discoverAttributesExtended']);
// Tuya EF00 queries only (no datapoint writes): asking twice gives the same answer.
const WRAPPED_TUYA = new Set(['dataQuery', 'mcuVersionRequest', 'mcuSyncTime', 'getData']);
const DEDUPE_SKIP = new Set(['getData']); // getData(dp) differs per dp; dedupe only identical args anyway

const DEFAULTS = Object.freeze({
  windowMs: 180000,
  dedupeMs: 15000,
  gapMainsMs: 80,
  gapBatteryMs: 150,
  burst: 3,
  globalGapMs: 20,
  maxDelayMs: 5000,
  maxDedupe: 64,
  maxCacheAttrs: 24,
  maxPending: 64,
  deferMaxMs: 120000,
  maxDeferWaiters: 64,
});

let globalNextSlot = 0;
const WRAPPED = new WeakSet(); // clusters already wrapped (no own marker property: proxies/frozen objects) // app-wide spacing across devices (boot storm)

function stableKey(v, depth = 0) {
  if (depth > 4) {return '…';}
  if (v === null || v === undefined) {return String(v);}
  if (Array.isArray(v)) {return `[${v.map((x) => stableKey(x, depth + 1)).join(',')}]`;}
  if (Buffer.isBuffer(v)) {return `b:${v.toString('hex')}`;}
  if (typeof v === 'object') {
    return `{${Object.keys(v).sort().map((k) => `${k}:${stableKey(v[k], depth + 1)}`).join(',')}}`;
  }
  return `${typeof v}:${String(v)}`;
}

function isTuyaCluster(name, cluster) {
  const id = cluster && cluster.constructor && cluster.constructor.ID;
  return name === 'tuya' || name === 'manuSpecificTuya' || id === 0xEF00 || id === 61184;
}

function isBasic(name, cluster) {
  const id = cluster && cluster.constructor && cluster.constructor.ID;
  return name === 'basic' || name === 'genBasic' || id === 0;
}

function looksBattery(device) {
  try {
    if (device.hasCapability && device.hasCapability('measure_battery')) {return true;}
    if (device.hasCapability && device.hasCapability('alarm_battery')) {return true;}
    const ps = device.getStoreValue && device.getStoreValue('powerSource');
    if (typeof ps === 'string' && /battery/i.test(ps)) {return true;}
  } catch (_e) { /* soft */ }
  return false;
}

function isMains(device) {
  try {
    if (device.mainsPowered === true) {return true;}
    const ps = device.getStoreValue && device.getStoreValue('powerSource');
    if (typeof ps === 'string' && /mains/i.test(ps)) {return true;}
  } catch (_e) { /* soft */ }
  return false;
}

// WHY: only a restart of a battery device is deferred. First init after pairing keeps the
// old behaviour (the device is awake and the interview is still running); unknown → no defer.
function shouldDeferToRx(device, battery, opts) {
  if (!battery || opts.deferFirstRx === false) {return false;}
  try {
    if (isMains(device)) {return false;}
    if (device.getSetting && device.getSetting('init_tx_defer_rx') === false) {return false;}
    if (typeof device.isFirstInit !== 'function') {return false;}
    return device.isFirstInit() === false;
  } catch (_e) { return false; }
}

function disabled(device) {
  try {
    if (device.homey && device.homey.settings && device.homey.settings.get('init_tx_pacer_disabled') === true) {return true;}
    if (device.getSetting && device.getSetting('init_tx_pacer') === false) {return true;}
  } catch (_e) { /* soft */ }
  return false;
}

class InitTxPacer {
  constructor(device, opts = {}) {
    this.device = device;
    this.o = { ...DEFAULTS, ...opts };
    this.now = typeof opts.now === 'function' ? opts.now : () => Date.now();
    this.startedAt = this.now();
    this.battery = looksBattery(device);
    this.gap = this.battery ? this.o.gapBatteryMs : this.o.gapMainsMs;
    this.nextSlot = 0;
    this.pending = 0;
    this.inflight = new Map(); // key -> { at, promise }
    this.basicCache = new Map(); // attr name -> value
    this.m = { tx: 0, deduped: 0, cached: 0, paced: 0, overflow: 0, failed: 0, maxDelayMs: 0, firstTxMs: null, lastTxMs: null, deferred: 0, deferTimeout: 0, firstRxMs: null };
    this.deferToRx = shouldDeferToRx(device, this.battery, this.o);
    this.rxSeen = false;
    this._rxWaiters = []; // resolvers waiting for the first RX (bounded maxDeferWaiters)
    this._deferTimerArmed = false;
    this._starts = []; // last starts for peak-per-second (bounded 64)
    this.peak1s = 0;
    this.wrapped = 0;
  }

  active() {
    return this.now() - this.startedAt < this.o.windowMs;
  }

  _sleep(ms) {
    const d = this.device;
    return new Promise((resolve) => {
      try {
        if (d && d.homey && typeof d.homey.setTimeout === 'function') { d.homey.setTimeout(resolve, ms); return; }
      } catch (_e) { /* fall through */ }
      // native setTimeout only when there is no homey (unit tests / harness)
      setTimeout(resolve, ms);
    });
  }

  _noteStart() {
    const t = this.now();
    const rel = t - this.startedAt;
    if (this.m.firstTxMs === null) {this.m.firstTxMs = rel;}
    this.m.lastTxMs = rel;
    this.m.tx++;
    this._starts.push(t);
    if (this._starts.length > 64) {this._starts.shift();}
    let n = 0;
    for (let i = this._starts.length - 1; i >= 0 && t - this._starts[i] < 1000; i--) {n++;}
    if (n > this.peak1s) {this.peak1s = n;}
  }

  /** First frame received from the device: release every request waiting for it. */
  noteRx() {
    if (this.rxSeen) {return;}
    this.rxSeen = true;
    this.m.firstRxMs = this.now() - this.startedAt;
    this._releaseWaiters();
  }

  _releaseWaiters() {
    const w = this._rxWaiters;
    this._rxWaiters = [];
    for (const r of w) { try { r(); } catch (_e) { /* soft */ } }
  }

  _waitFirstRx() {
    if (!this.deferToRx || this.rxSeen) {return null;}
    const left = this.o.deferMaxMs - (this.now() - this.startedAt);
    if (left <= 0 || this._rxWaiters.length >= this.o.maxDeferWaiters) {return null;}
    this.m.deferred++;
    const p = new Promise((resolve) => { this._rxWaiters.push(resolve); });
    if (!this._deferTimerArmed) {
      this._deferTimerArmed = true;
      // one timer per device for the whole wait: after it, requests leave as before
      this._sleep(left).then(() => {
        if (this.rxSeen) {return;}
        this.deferToRx = false;
        this.m.deferTimeout++;
        this._releaseWaiters();
      });
    }
    return p;
  }

  async _paceThenRun(run) {
    const wait = this._waitFirstRx();
    if (wait) {
      await wait;
      if (this.device && this.device._destroyed) {throw new Error('device destroyed');}
    }
    const t = this.now();
    // clock jumps / long idle: never carry a slot further than maxDelayMs ahead
    if (globalNextSlot > t + this.o.maxDelayMs) {globalNextSlot = t;}
    // GCRA: `burst` starts may go out together, then one per gap (nextSlot = theoretical arrival time)
    const tolerance = this.gap * Math.max(0, this.o.burst - 1);
    let slot = this.nextSlot - t > tolerance ? this.nextSlot - tolerance : t;
    slot = Math.max(slot, globalNextSlot);
    let delay = slot - t;
    if (delay > this.o.maxDelayMs) { delay = this.o.maxDelayMs; slot = t + delay; }
    if (delay > 0 && this.pending >= this.o.maxPending) {
      this.m.overflow++;
      delay = 0; slot = t;
    }
    this.nextSlot = Math.max(this.nextSlot, slot) + this.gap;
    globalNextSlot = slot + this.o.globalGapMs;
    if (delay > 0) {
      this.m.paced++;
      if (delay > this.m.maxDelayMs) {this.m.maxDelayMs = delay;}
      this.pending++;
      try { await this._sleep(delay); } finally { this.pending--; }
      if (this.device && this.device._destroyed) {throw new Error('device destroyed');}
    }
    this._noteStart();
    return run();
  }

  _trimInflight() {
    const t = this.now();
    for (const [k, v] of this.inflight) {
      if (t - v.at > this.o.dedupeMs) {this.inflight.delete(k);}
    }
    while (this.inflight.size > this.o.maxDedupe) {
      this.inflight.delete(this.inflight.keys().next().value);
    }
  }

  _cacheBasic(result) {
    if (!result || typeof result !== 'object') {return;}
    for (const [k, v] of Object.entries(result)) {
      if (v === undefined || v === null) {continue;}
      if (!this.basicCache.has(k) && this.basicCache.size >= this.o.maxCacheAttrs) {continue;}
      this.basicCache.set(k, v);
    }
  }

  _fromBasicCache(attrs) {
    if (!Array.isArray(attrs) || !attrs.length) {return null;}
    const out = {};
    for (const a of attrs) {
      if (typeof a !== 'string' || !this.basicCache.has(a)) {return null;}
      out[a] = this.basicCache.get(a);
    }
    return out;
  }

  /** Called through the wrapper; orig is the unwrapped bound method. */
  call(epId, name, method, cluster, orig, args) {
    if (!this.active() || disabled(this.device)) {return orig(...args);}
    const basic = isBasic(name, cluster);
    if (basic && method === 'readAttributes') {
      const hit = this._fromBasicCache(args[0]);
      if (hit) { this.m.cached++; return Promise.resolve(hit); }
    }
    let key = null;
    if (!DEDUPE_SKIP.has(method) || args.length) {
      key = `${epId}|${name}|${method}|${stableKey(args)}`;
      this._trimInflight();
      const prev = this.inflight.get(key);
      if (prev && this.now() - prev.at <= this.o.dedupeMs) {
        this.m.deduped++;
        return prev.promise;
      }
    }
    const p = this._paceThenRun(() => orig(...args)).then((r) => {
      if (basic && method === 'readAttributes') {this._cacheBasic(r);}
      return r;
    }, (err) => {
      this.m.failed++;
      if (key) {this.inflight.delete(key);} // a failure must not be replayed to later callers
      throw err;
    });
    if (key) { this.inflight.set(key, { at: this.now(), promise: p }); this._trimInflight(); }
    return p;
  }

  /** Rejoin / power cut: forget cached answers so the magic packet and queries really go out. */
  resetForRejoin() {
    this.noteRx(); // a rejoin is a frame from an awake device
    this.inflight.clear();
    this.basicCache.clear();
  }

  metrics(extra = {}) {
    return {
      v: 1,
      battery: this.battery,
      windowS: Math.round(this.o.windowMs / 1000),
      tx: this.m.tx,
      deduped: this.m.deduped,
      cached: this.m.cached,
      paced: this.m.paced,
      overflow: this.m.overflow,
      failed: this.m.failed,
      peak1s: this.peak1s,
      maxDelayMs: this.m.maxDelayMs,
      firstTxMs: this.m.firstTxMs,
      lastTxMs: this.m.lastTxMs,
      deferToRx: this.deferToRx,
      deferred: this.m.deferred,
      deferTimeout: this.m.deferTimeout,
      firstRxMs: this.m.firstRxMs,
      ...extra,
    };
  }
}

function wrapCluster(pacer, epId, name, cluster) {
  if (!cluster || typeof cluster !== 'object' || WRAPPED.has(cluster)) {return 0;}
  WRAPPED.add(cluster);
  const tuya = isTuyaCluster(name, cluster);
  const set = tuya ? new Set([...WRAPPED_ZCL, ...WRAPPED_TUYA]) : WRAPPED_ZCL;
  let n = 0;
  const methods = isBasic(name, cluster) ? new Set([...set, 'writeAttributes']) : set;
  for (const method of methods) {
    const fn = cluster[method];
    if (typeof fn !== 'function') {continue;}
    // Inherited method: resolve on the prototype at call time, so a prototype guard installed
    // later (ZclUnsupportedGuard.guardAllRegistered) still applies. Own method: keep it.
    const own = Object.prototype.hasOwnProperty.call(cluster, method);
    const proto = Object.getPrototypeOf(cluster);
    const orig = own || !proto || typeof proto[method] !== 'function'
      ? fn.bind(cluster)
      : (...a) => proto[method].apply(cluster, a);
    try {
      Object.defineProperty(cluster, method, {
        configurable: true,
        writable: true,
        value: (...args) => pacer.call(epId, name, method, cluster, orig, args),
      });
      n++;
    } catch (_e) { /* frozen cluster: leave untouched */ }
  }
  return n;
}

/**
 * Attach a pacer to every cluster of the device's ZCL node. Idempotent per device.
 * @returns {InitTxPacer|null}
 */
function attach(device, zclNode, opts = {}) {
  if (!device || !zclNode || !zclNode.endpoints) {return null;}
  if (disabled(device)) {return null;}
  if (device._initTxPacer) {return device._initTxPacer;}
  const pacer = new InitTxPacer(device, opts);
  for (const [epId, ep] of Object.entries(zclNode.endpoints)) {
    const clusters = ep && ep.clusters;
    if (!clusters || typeof clusters !== 'object') {continue;}
    for (const [name, cluster] of Object.entries(clusters)) {
      pacer.wrapped += wrapCluster(pacer, epId, name, cluster);
    }
  }
  try { Object.defineProperty(device, '_initTxPacer', { value: pacer, configurable: true, writable: true }); } catch (_e) { device._initTxPacer = pacer; }
  if (pacer.deferToRx) {hookFirstRx(pacer, opts.node || device.node);}
  return pacer;
}

// L-P3040-03: observe incoming frames (never swallow, never change them) to learn the
// device is awake. Placed first in the shared handleFrame chain so no other layer can hide it.
function hookFirstRx(pacer, node) {
  if (!node || typeof node !== 'object') { pacer.deferToRx = false; return; }
  try {
    const { wrapHandleFrame } = require('../utils/BidirectionalButtonState');
    const ok = wrapHandleFrame(node, 'p3040-first-rx', (args, next) => {
      try { pacer.noteRx(); } catch (_e) { /* soft */ }
      return next();
    });
    if (!ok) { pacer.deferToRx = false; return; }
    const chain = node._bidirectionalHandleFrameChain;
    const i = Array.isArray(chain) ? chain.findIndex((e) => e.tag === 'p3040-first-rx') : -1;
    if (i > 0) { chain.unshift(chain.splice(i, 1)[0]); }
  } catch (_e) {
    pacer.deferToRx = false; // cannot see RX: never wait blind
  }
}

function _resetGlobalForTests() { globalNextSlot = 0; }

module.exports = { attach, InitTxPacer, DEFAULTS, _resetGlobalForTests };
