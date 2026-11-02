'use strict';

/**
 * P3207 DynamicBindingAdapter — GH#598 generalised (docs/rules/DYNAMIC_ADAPTATION.md).
 *
 * Manifest `bindings` become bind requests DURING PAIRING; a cluster the node lacks
 * can make Homey report "Unable to connect". So risky clusters live in
 * data/runtime-bindings.json instead, and this adapter, after init:
 *   1. binds each one ONLY if the node's endpoint descriptor lists it (input or output);
 *   2. configures reporting for a few read-only measurement clusters, each in its own try/catch;
 *   3. adds the matching capability lazily when a real report arrives (never removes);
 *   4. on a sleepy node, defers failed steps to the next frame the node sends (first wake).
 * Bounded: ≤ MAX_PAIRS pairs per device, ≤ MAX_ATTEMPTS each, one frame hook, nothing global.
 * Never throws, never touches 0xEF00, never runs onOff/level reporting (TS004x storms).
 */

const EF00 = 61184;
const MAX_PAIRS = 16;
const MAX_ATTEMPTS = 3;
const STEP_TIMEOUT_MS = 8000;
const STORE_KEY = 'p3207_dynBind';

// Read-only measurement clusters: reporting + lazy capability. onOff/level deliberately absent.
const MEASURE = {
  1: { attr: 'batteryPercentageRemaining', cap: 'measure_battery', xform: v => Math.max(0, Math.min(100, Math.round(v / 2))), rep: { minInterval: 3600, maxInterval: 43200, minChange: 2 } },
  1024: { attr: 'measuredValue', cap: 'measure_luminance', xform: v => v > 0 ? Math.round(Math.pow(10, (v - 1) / 10000)) : 0, rep: { minInterval: 60, maxInterval: 3600, minChange: 100 } },
  1026: { attr: 'measuredValue', cap: 'measure_temperature', xform: v => Math.round(v) / 100, rep: { minInterval: 60, maxInterval: 3600, minChange: 10 } },
  1029: { attr: 'measuredValue', cap: 'measure_humidity', xform: v => Math.round(v) / 100, rep: { minInterval: 60, maxInterval: 3600, minChange: 100 } },
};

let _table = null;
function table() {
  if (_table) {return _table;}
  try { _table = require('./data/runtime-bindings.json'); } catch (_e) { _table = {}; }
  return _table;
}

function driverIdOf(device) {
  try { return device.driver && (device.driver.id || (device.driver.manifest && device.driver.manifest.id)); } catch (_e) { return null; }
}

/** Pure: intended [{ep, cid}] for a driver id (follows manifest continuationOf when given). */
function intendedFor(driverId, opts = {}) {
  const t = opts.table || table();
  const row = t[driverId] || (opts.continuationOf && t[opts.continuationOf]) || null;
  const out = [];
  if (!row || typeof row !== 'object') {return out;}
  for (const [ep, list] of Object.entries(row)) {
    if (!Array.isArray(list)) {continue;}
    for (const cid of list) {
      const n = Number(cid);
      if (!Number.isInteger(n) || n === EF00) {continue;} // WHY: EF00 never needs/gets a bind
      out.push({ ep: Number(ep), cid: n });
      if (out.length >= MAX_PAIRS) {return out;}
    }
  }
  return out;
}

/** Pure: cluster ids the node really serves/sends on an endpoint, or null when unknown. */
function descriptorClusters(zclNode, node, ep) {
  const pick = (d) => d ? [].concat(d.inputClusters || [], d.outputClusters || []).map(Number) : null;
  try {
    const e = zclNode && zclNode.endpoints && zclNode.endpoints[ep];
    if (e && e._descriptor) {return pick(e._descriptor);}
  } catch (_e) { /* fallthrough */ }
  try {
    const list = node && Array.isArray(node.endpointDescriptors) ? node.endpointDescriptors : [];
    const d = list.find(x => Number(x.endpointId) === Number(ep));
    if (d) {return pick(d);}
  } catch (_e) { /* fallthrough */ }
  return null;
}

function clusterInstance(zclNode, ep, cid) {
  try {
    const e = zclNode.endpoints[ep];
    if (!e || !e.clusters) {return null;}
    for (const c of Object.values(e.clusters)) {
      if (c && c.constructor && Number(c.constructor.ID) === cid) {return c;}
    }
  } catch (_e) { /* none */ }
  return null;
}

function isSleepy(device) {
  try {
    if (device.node && device.node.receiveWhenIdle === false) {return true;}
    return typeof device.hasCapability === 'function' && (device.hasCapability('measure_battery') || device.hasCapability('alarm_battery'));
  } catch (_e) { return false; }
}

// WHY: native setTimeout (module-level helper, no homey here); unref'd and always cleared in finally.
function withTimeout(p, ms) {
  let t;
  return Promise.race([Promise.resolve(p), new Promise((_, rej) => { t = setTimeout(() => rej(new Error('timeout')), ms); if (t.unref) {t.unref();} })])
    .finally(() => clearTimeout(t));
}

function log(device, msg) { try { device.log(`[DYN-BIND] ${msg}`); } catch (_e) { /* noop */ } }

/** Lazy capability: added only when a real value arrives; never removed. */
function lazyListen(device, cluster, cid) {
  const m = MEASURE[cid];
  if (!m || !cluster || typeof cluster.on !== 'function') {return false;}
  try {
    if (!device._p3207Listen) {device._p3207Listen = new Set();}
    const key = `${cid}`;
    if (device._p3207Listen.has(key)) {return false;}
    device._p3207Listen.add(key);
    cluster.on(`attr.${m.attr}`, async (value) => {
      if (device._destroyed || value === undefined || value === null || typeof value !== 'number') {return;}
      try {
        if (!device.hasCapability(m.cap)) {
          await device.addCapability(m.cap);
          log(device, `lazy +${m.cap} (first report on cluster ${cid})`);
        }
        await device.setCapabilityValue(m.cap, m.xform(value));
      } catch (_e) { /* non-fatal */ }
    });
    return true;
  } catch (_e) { return false; }
}

async function runOnce(device, zclNode, state) {
  const done = state.done;
  let pending = 0;
  for (const it of state.items) {
    const key = `${it.ep}:${it.cid}`;
    if (done.has(key) || (state.attempts[key] || 0) >= MAX_ATTEMPTS) {continue;}
    const present = descriptorClusters(zclNode, device.node, it.ep);
    if (!present || !present.includes(it.cid)) { done.add(key); state.skipped.push(key); continue; } // absent → never asked
    const cluster = clusterInstance(zclNode, it.ep, it.cid);
    if (!cluster || typeof cluster.bind !== 'function') { done.add(key); state.skipped.push(key); continue; }
    state.attempts[key] = (state.attempts[key] || 0) + 1;
    try {
      await withTimeout(cluster.bind(), STEP_TIMEOUT_MS);
      const m = MEASURE[it.cid];
      if (m && typeof cluster.configureReporting === 'function') {
        try { await withTimeout(cluster.configureReporting({ [m.attr]: m.rep }), STEP_TIMEOUT_MS); } catch (e) { log(device, `report ${key} skipped: ${e && e.message}`); }
      }
      lazyListen(device, cluster, it.cid);
      done.add(key);
      log(device, `bound ${key}`);
    } catch (e) {
      pending++;
      log(device, `bind ${key} failed (${state.attempts[key]}/${MAX_ATTEMPTS}): ${e && e.message}`);
    }
  }
  try { if (typeof device.setStoreValue === 'function') {await device.setStoreValue(STORE_KEY, [...done].slice(0, MAX_PAIRS));} } catch (_e) { /* non-fatal */ }
  return pending;
}

/** One-shot hook: rerun pending steps on the next frame a sleepy node sends (it is awake then). */
function deferToWake(device, zclNode, state) {
  if (!zclNode || typeof zclNode.handleFrame !== 'function' || state.hooked) {return false;}
  state.hooked = true;
  const orig = zclNode.handleFrame;
  zclNode.handleFrame = function p3207WakeHook(...args) {
    zclNode.handleFrame = orig; // WHY: restore first so a throw below can never leave the hook in place
    state.hooked = false;
    const timers = device.homey && typeof device.homey.setTimeout === 'function' ? device.homey : null;
    if (!timers) {return orig.apply(this, args);}
    timers.setTimeout(() => {
      if (device._destroyed) {return;}
      runOnce(device, zclNode, state).then((left) => { if (left > 0) {deferToWake(device, zclNode, state);} }).catch(() => {});
    }, 500);
    return orig.apply(this, args);
  };
  return true;
}

/** Entry point. Resolves to a summary; never throws. */
async function attach(device, zclNode, opts = {}) {
  try {
    if (!device || !zclNode || device._p3207Attached) {return { skipped: 'noop' };}
    const did = opts.driverId || driverIdOf(device);
    let contOf = null;
    try { contOf = device.driver && device.driver.manifest && device.driver.manifest.continuationOf; } catch (_e) { /* none */ }
    const items = intendedFor(did, { table: opts.table, continuationOf: contOf });
    if (!items.length) {return { skipped: 'none' };}
    device._p3207Attached = true;
    let stored = [];
    try { stored = (typeof device.getStoreValue === 'function' && device.getStoreValue(STORE_KEY)) || []; } catch (_e) { stored = []; }
    const state = { items, done: new Set(Array.isArray(stored) ? stored : []), attempts: {}, skipped: [], hooked: false };
    // Already-bound pairs still need their lazy listener after a restart.
    for (const key of state.done) {
      const [ep, cid] = key.split(':').map(Number);
      lazyListen(device, clusterInstance(zclNode, ep, cid), cid);
    }
    const left = await runOnce(device, zclNode, state);
    if (left > 0 && isSleepy(device)) {deferToWake(device, zclNode, state);}
    return { bound: [...state.done].filter(k => !state.skipped.includes(k)), skipped: state.skipped, pending: left };
  } catch (e) {
    log(device, `attach failed (non-fatal): ${e && e.message}`);
    return { error: true };
  }
}

module.exports = { attach, intendedFor, descriptorClusters, isSleepy, MEASURE, MAX_PAIRS, MAX_ATTEMPTS, STORE_KEY };
