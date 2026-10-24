'use strict';

/**
 * P3017: MethodChain — ordered, self-healing method chains per device and per operation.
 *
 * When an operation (read a capability, write it, get reports) is not handled natively,
 * try alternative / indirect paths in a fixed tier order, fail over automatically on
 * "unsupported" AND on timeout, remember per device what works, and periodically re-probe
 * the better (earlier) tiers with a bounded backoff so a firmware update or a woken-up
 * device recovers the native path by itself.
 *
 * Tier order (lower = preferred):
 *   zcl-native → zcl-raw-numeric → tuya-dp → tuya-private (E000/E001/ED00) → alt-endpoint
 *   → poll (instead of reporting) → magic-query (magic packet / dataQuery 0x03) → derived
 * A step without a known tier keeps its caller position after the known ones it follows.
 *
 * Contract:
 *  - unsupported (ZCL status / UnsupportedRegistry.isUnsupportedError) → demote with backoff,
 *    also recorded in the P3011 UnsupportedRegistry (label = domain) → next tier;
 *  - timeout / transient → next tier at once (failover) but the step is only demoted after
 *    MAX_TIMEOUTS consecutive timeouts, so one radio hiccup never poisons it;
 *  - success → becomes the remembered winner; a demoted earlier tier that succeeds on a
 *    re-probe is promoted back ("recovered");
 *  - never touches capabilities (no add/remove) and never throws.
 * Store key 'method_chain_state' (bounded: MAX_DOMAINS LRU, compact fields).
 */

const STORE_KEY = 'method_chain_state';
const MAX_DOMAINS = 60;
const MAX_TIMEOUTS = 2;
const DEFAULT_TIMEOUT_MS = 10000;
/** Re-probe backoff of a demoted step: 15 min, 1 h, 4 h, 12 h, then 24 h cap. */
const BACKOFF_MS = Object.freeze([15 * 60e3, 60 * 60e3, 4 * 3600e3, 12 * 3600e3, 24 * 3600e3]);
const TIERS = Object.freeze(['zcl-native', 'zcl-raw-numeric', 'tuya-dp', 'tuya-private', 'alt-endpoint', 'poll', 'magic-query', 'derived']);
const TIER_ALIASES = Object.freeze({ 'zcl-named': 'zcl-native', zcl: 'zcl-native', dp: 'tuya-dp', 'tuya-ef00': 'tuya-dp', e000: 'tuya-private', e001: 'tuya-private', ed00: 'tuya-private', polling: 'poll', 'data-query': 'magic-query', magic: 'magic-query', computed: 'derived', 'last-known': 'derived' });

function tierOf(step) {
  const t = (step && (step.tier || step.name)) || '';
  const k = TIER_ALIASES[t] || t;
  const i = TIERS.indexOf(k);
  return i < 0 ? -1 : i;
}

/** Stable sort by tier; unknown-tier steps keep their position relative to the previous known one. */
function orderSteps(steps) {
  let last = -1;
  return (Array.isArray(steps) ? steps : [])
    .filter((s) => s && typeof s.run === 'function' && s.name)
    .map((s, idx) => { const t = tierOf(s); if (t >= 0) { last = t; } return { s, rank: t >= 0 ? t : last + 0.5, idx }; })
    .sort((a, b) => (a.rank - b.rank) || (a.idx - b.idx))
    .map((x) => x.s);
}

function _isUnsupported(err) {
  try { return require('./UnsupportedRegistry').isUnsupportedError(err); } catch (_e) {
    return /UNSUP|unsupported/i.test(String(err && err.message));
  }
}

function _isTimeout(err) {
  return !!(err && (err.code === 'ETIMEDOUT' || err.timeout === true || /timeout|timed out|no response|ack/i.test(String(err.message))));
}

function _registry(device) {
  try { return require('./UnsupportedRegistry').getRegistry(device); } catch (_e) { return null; }
}

function _load(device) {
  try {
    const v = device && typeof device.getStoreValue === 'function' ? device.getStoreValue(STORE_KEY) : null;
    if (v && typeof v === 'object') { return JSON.parse(JSON.stringify(v)); }
  } catch (_e) { /* fresh */ }
  return {};
}

function _save(device, st) {
  try {
    const keys = Object.keys(st);
    if (keys.length > MAX_DOMAINS) {
      keys.sort((a, b) => (st[a].at || 0) - (st[b].at || 0)).slice(0, keys.length - MAX_DOMAINS).forEach((k) => { delete st[k]; });
    }
    if (device && typeof device.setStoreValue === 'function') {
      const p = device.setStoreValue(STORE_KEY, st);
      if (p && typeof p.catch === 'function') { p.catch(() => {}); }
    }
  } catch (_e) { /* soft */ }
}

function _log(device, msg) { try { if (device && typeof device.log === 'function') { device.log(`[METHOD-CHAIN] ${msg}`); } } catch (_e) { /* soft */ } }

function _withTimeout(device, fn, ms) {
  if (!ms || ms <= 0) { return Promise.resolve().then(fn); }
  return new Promise((resolve, reject) => {
    let done = false;
    const sched = device && device.homey && typeof device.homey.setTimeout === 'function' ? device.homey : globalThis;
    const clear = device && device.homey && typeof device.homey.clearTimeout === 'function' ? device.homey.clearTimeout.bind(device.homey) : globalThis.clearTimeout;
    const t = sched.setTimeout(() => {
      if (done) { return; }
      done = true;
      reject(Object.assign(new Error('method-chain timeout'), { code: 'ETIMEDOUT', timeout: true }));
    }, ms);
    Promise.resolve().then(fn).then((v) => { if (!done) { done = true; try { clear(t); } catch (_e) { /* soft */ } resolve(v); } },
      (e) => { if (!done) { done = true; try { clear(t); } catch (_e) { /* soft */ } reject(e); } });
  });
}

function _demote(e, now, reason) {
  const b = Math.min(e.b || 0, BACKOFF_MS.length - 1);
  e.n = now + BACKOFF_MS[b];
  e.b = Math.min(b + 1, BACKOFF_MS.length - 1);
  e.r = reason;
  e.t = 0;
}

/**
 * @param {Object} device Homey device (store + log)
 * @param {string} domain e.g. 'read.measure_temperature', 'write.onoff'
 * @param {Array<{name:string, tier?:string, run:Function}>} steps
 * @param {{now?:number, timeoutMs?:number, maxTimeouts?:number}} [opts]
 * @returns {Promise<{ok:boolean, via:string|null, result?:any, recovered?:boolean, tried:string[], failover:Array<{name:string,why:string}>, transient?:boolean, error?:Error}>}
 */
async function runChain(device, domain, steps, opts = {}) {
  const tried = [];
  const failover = [];
  try {
    const now = Number.isFinite(opts.now) ? opts.now : Date.now();
    const maxTimeouts = opts.maxTimeouts || MAX_TIMEOUTS;
    const timeoutMs = opts.timeoutMs === undefined ? DEFAULT_TIMEOUT_MS : opts.timeoutMs;
    const ordered = orderSteps(steps);
    if (!ordered.length) { return { ok: false, via: null, tried, failover }; }
    const st = _load(device);
    const dom = st[domain] || (st[domain] = { w: null, d: {} });
    dom.at = now;
    const reg = _registry(device);
    // Plan: tier order, skipping steps still inside their backoff window. A step whose window
    // expired is a re-probe (the native/earlier path gets its chance back).
    const plan = [];
    const reprobe = new Set();
    ordered.forEach((s) => {
      const e = dom.d[s.name];
      if (e && e.n) {
        if (now < e.n) { return; }
        reprobe.add(s.name);
      } else if (!e && reg && typeof reg.isKnown === 'function' && reg.isKnown(domain, s.name)) {
        return; // registry already knows it is dead here (expires on its own TTL)
      }
      plan.push(s);
    });
    // If everything is demoted keep the chain alive: try the earliest-due step anyway.
    if (!plan.length) {
      const due = ordered.slice().sort((a, b) => ((dom.d[a.name] || {}).n || 0) - ((dom.d[b.name] || {}).n || 0))[0];
      plan.push(due);
    }

    let lastErr = null;
    let sawTimeout = false;
    for (const s of plan) {
      tried.push(s.name);
      const e = dom.d[s.name] || (dom.d[s.name] = {});
      try {
        // eslint-disable-next-line no-await-in-loop
        const result = await _withTimeout(device, s.run, s.timeoutMs === undefined ? timeoutMs : s.timeoutMs);
        const recovered = reprobe.has(s.name) || !!e.r;
        if (dom.w !== s.name) { _log(device, `${domain}: ${dom.w || '(none)'} → ${s.name}${recovered ? ' (recovered)' : ''}`); }
        dom.w = s.name;
        dom.d[s.name] = { ok: now };
        _save(device, st);
        return { ok: true, via: s.name, result, recovered, tried, failover };
      } catch (err) {
        lastErr = err;
        if (_isUnsupported(err)) {
          _demote(e, now, 'unsupported');
          try { if (reg && reg.mark) { reg.mark(domain, s.name, 'next-method'); } } catch (_e) { /* soft */ }
          failover.push({ name: s.name, why: 'unsupported' });
        } else if (_isTimeout(err)) {
          sawTimeout = true;
          e.t = (e.t || 0) + 1;
          if (e.t >= maxTimeouts) { _demote(e, now, 'timeout'); }
          failover.push({ name: s.name, why: 'timeout' });
        } else {
          sawTimeout = true;
          failover.push({ name: s.name, why: 'error' });
        }
        if (dom.w === s.name && e.n) { dom.w = null; }
      }
    }
    _save(device, st);
    return { ok: false, via: null, tried, failover, transient: sawTimeout, error: lastErr };
  } catch (err) {
    return { ok: false, via: null, tried, failover, error: err };
  }
}

/** Snapshot for diagnostics: { domain: { winner, demoted: {name: {until, reason}} } } */
function snapshot(device) {
  const st = _load(device);
  const out = {};
  for (const [k, v] of Object.entries(st)) {
    const demoted = {};
    for (const [n, e] of Object.entries(v.d || {})) { if (e && e.n) { demoted[n] = { until: e.n, reason: e.r }; } }
    out[k] = { winner: v.w || null, demoted };
  }
  return out;
}

/** Forget what was learned for one domain (or all) so the next call re-probes from the top. */
function reset(device, domain) {
  const st = domain ? Object.assign(_load(device), { [domain]: undefined }) : {};
  if (domain) { delete st[domain]; }
  _save(device, st);
}

/**
 * Build the standard steps for reading one ZCL attribute with every indirect path.
 * Each provider is optional; missing ones are simply absent from the chain.
 * @param {Object} device
 * @param {{cluster?:Object, clusterLabel:string, attribute:string, clusterId?:number, endpoint?:number,
 *          dpRead?:Function, privateRead?:Function, poll?:Function, derive?:Function, magic?:boolean}} spec
 */
function standardReadSteps(device, spec = {}) {
  const steps = [];
  const attr = spec.attribute;
  const read = async (c) => {
    const data = await c.readAttributes([attr]);
    if (data && data[attr] !== undefined) { return data[attr]; }
    throw Object.assign(new Error('UNSUPPORTED_ATTRIBUTE'), { status: 0x86 });
  };
  const eps = (device && device.zclNode && device.zclNode.endpoints) || {};
  const ep0 = Number(spec.endpoint) || 1;
  if (spec.cluster && typeof spec.cluster.readAttributes === 'function') { steps.push({ name: 'zcl-native', run: () => read(spec.cluster) }); }
  if (spec.clusterId !== undefined) {
    steps.push({ name: 'zcl-raw-numeric', run: () => {
      const c = eps[ep0] && eps[ep0].clusters && (eps[ep0].clusters[spec.clusterId] || eps[ep0].clusters[String(spec.clusterId)]);
      if (!c || c === spec.cluster || typeof c.readAttributes !== 'function') { throw Object.assign(new Error('UNSUPPORTED_CLUSTER'), { status: 0x81 }); }
      return read(c);
    } });
  }
  if (typeof spec.dpRead === 'function') { steps.push({ name: 'tuya-dp', run: async () => { const v = await spec.dpRead(device); if (v === undefined || v === null) { throw new Error('timeout: dp-no-value'); } return v; } }); }
  if (typeof spec.privateRead === 'function') { steps.push({ name: 'tuya-private', run: async () => { const v = await spec.privateRead(device); if (v === undefined || v === null) { throw Object.assign(new Error('UNSUPPORTED_ATTRIBUTE'), { status: 0x86 }); } return v; } }); }
  steps.push({ name: 'alt-endpoint', run: async () => {
    const label = spec.clusterLabel;
    for (const [id, ep] of Object.entries(eps)) {
      if (Number(id) === ep0 || !ep || !ep.clusters) { continue; }
      const c = ep.clusters[label] || (spec.clusterId !== undefined ? ep.clusters[spec.clusterId] : null);
      if (c && typeof c.readAttributes === 'function') {
        // eslint-disable-next-line no-await-in-loop
        try { return await read(c); } catch (err) { if (!_isUnsupported(err)) { throw err; } }
      }
    }
    throw Object.assign(new Error('UNSUPPORTED_CLUSTER'), { status: 0x81 });
  } });
  if (typeof spec.poll === 'function') { steps.push({ name: 'poll', run: () => spec.poll(device) }); }
  if (spec.magic !== false) {
    steps.push({ name: 'magic-query', run: async () => {
      const m = device && (device.tuyaEF00Manager || device._tuyaEF00Manager);
      const hasEf00 = Object.values(eps).some((ep) => ep && ep.clusters && (ep.clusters.tuya || ep.clusters[61184] || ep.clusters['61184'] || ep.clusters.manuSpecificTuya));
      if (hasEf00 && m && typeof m.queryAllDatapoints === 'function') { await m.queryAllDatapoints({ force: true }); return undefined; }
      throw Object.assign(new Error('UNSUPPORTED_CLUSTER'), { status: 0x81 });
    } });
  }
  if (typeof spec.derive === 'function') { steps.push({ name: 'derived', run: async () => { const v = await spec.derive(device); if (v === undefined || v === null) { throw Object.assign(new Error('UNSUPPORTED_ATTRIBUTE'), { status: 0x86 }); } return v; } }); }
  return steps;
}

module.exports = { runChain, orderSteps, tierOf, standardReadSteps, snapshot, reset, TIERS, BACKOFF_MS, MAX_TIMEOUTS, STORE_KEY };
