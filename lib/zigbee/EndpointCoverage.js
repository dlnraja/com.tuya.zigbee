'use strict';

/**
 * P3018: every interviewed endpoint is inventoried, listened to (read-only) and routed or exposed.
 *
 *  - inventory(zclNode)          → { eps: { '1': ['basic','onOff',..], .. }, gp: bool }  (bounded)
 *  - candidates(cap, ep)         → capability ids allowed for that endpoint (no cross-gang)
 *  - attach(device, zclNode)     → attaches passive `attr.*` listeners ONLY where nothing listens
 *                                  yet, routes to an EXISTING capability of the SAME endpoint,
 *                                  otherwise records the report in UnknownCommandSink (learned +
 *                                  exposed to Flows). Never writes, never binds, never reads:
 *                                  zero TX → safe on sleepy devices. EP 242 = Green Power → ignored.
 * ZCL scaling is the ZCL spec (measuredValue/100, lux = 10^((v-1)/10000)).
 */

const GP_EP = 242;
const MAX_EPS = 12;
const MAX_CLUSTERS = 24;
const MAX_UNROUTED = 32;

// cluster → [attr, capability root, convert(v) → value | undefined]
const ROUTES = Object.freeze({
  onOff: [['onOff', 'onoff', (v) => (typeof v === 'boolean' ? v : undefined)]],
  temperatureMeasurement: [['measuredValue', 'measure_temperature', (v) => (Number.isFinite(v) && v !== -32768 && v !== 0x8000 ? Math.round(v) / 100 : undefined)]],
  relativeHumidity: [['measuredValue', 'measure_humidity', (v) => (Number.isFinite(v) && v >= 0 && v <= 10000 ? Math.round(v) / 100 : undefined)]],
  illuminanceMeasurement: [['measuredValue', 'measure_luminance', (v) => (Number.isFinite(v) && v >= 0 && v < 0xffff ? (v === 0 ? 0 : Math.round(10 ** ((v - 1) / 10000))) : undefined)]],
  occupancySensing: [['occupancy', 'alarm_motion', (v) => {
    if (v && typeof v === 'object' && 'occupied' in v) { return !!v.occupied; }
    return Number.isFinite(Number(v)) ? (Number(v) & 1) === 1 : undefined;
  }]],
});

function inventory(zclNode) {
  const eps = {};
  let gp = false;
  const all = Object.keys((zclNode && zclNode.endpoints) || {}).map(Number).filter(Number.isInteger).sort((a, b) => a - b);
  for (const id of all.slice(0, MAX_EPS)) {
    if (id === GP_EP) { gp = true; continue; }
    const ep = zclNode.endpoints[id];
    eps[id] = Object.keys((ep && ep.clusters) || {}).sort().slice(0, MAX_CLUSTERS);
  }
  return { eps, gp };
}

/** Capabilities a report on endpoint `ep` may update. EP1 (or the device's lowest EP) → root only. */
function candidates(cap, ep, mainEp = 1) {
  const n = Number(ep);
  if (n === Number(mainEp)) { return [cap]; }
  return [`${cap}.gang${n}`, `${cap}.${n}`, `${cap}.channel${n}`, `${cap}.socket${n}`];
}

function _hasListener(cluster, evt) {
  try { return typeof cluster.listenerCount === 'function' ? cluster.listenerCount(evt) > 0 : true; } catch (_e) { return true; }
}

function _driverOwnsDp(device, cap) {
  try {
    const m = device.dpMappings;
    return !!(m && typeof m === 'object' && Object.values(m).some((r) => r && r.capability === cap));
  } catch (_e) { return false; }
}

function _st(device) {
  if (!device._p3018ep) { device._p3018ep = { routed: [], unrouted: new Map(), attached: 0, gp: false }; }
  return device._p3018ep;
}

function _unrouted(device, st, ep, clusterName, cluster, attr, value) {
  const k = `ep${ep}.${clusterName}.${attr}`;
  const e = st.unrouted.get(k) || { n: 0 };
  e.n++; e.last = typeof value === 'object' ? JSON.stringify(value).slice(0, 64) : value; e.at = Date.now();
  if (!st.unrouted.has(k) && st.unrouted.size >= MAX_UNROUTED) { st.unrouted.delete(st.unrouted.keys().next().value); }
  st.unrouted.set(k, e);
  try {
    const cid = cluster && cluster.constructor && Number(cluster.constructor.ID);
    require('./UnknownCommandSink').record(device, {
      clusterId: Number.isFinite(cid) ? cid : clusterName, clusterName, cmdId: 0x0a, endpoint: ep,
      data: Buffer.from(String(e.last)), direction: 'in', reason: `unrouted_attr:${attr}`,
    });
  } catch (_e) { /* soft */ }
}

function _route(device, st, ep, mainEp, clusterName, cluster, attr, capRoot, conv) {
  return (raw) => {
    try {
      if (device._destroyed) { return; }
      const v = conv(raw);
      if (v === undefined) { _unrouted(device, st, ep, clusterName, cluster, attr, raw); return; }
      const cap = candidates(capRoot, ep, mainEp).find((c) => device.hasCapability && device.hasCapability(c));
      if (!cap) { _unrouted(device, st, ep, clusterName, cluster, attr, raw); return; }
      const p = typeof device.safeSetCapabilityValue === 'function' ? device.safeSetCapabilityValue(cap, v) : device.setCapabilityValue(cap, v);
      if (p && typeof p.catch === 'function') { p.catch(() => {}); }
    } catch (_e) { /* never crash on RX */ }
  };
}

/** Persist a compact inventory once (only when it changed). */
function _persist(device, inv) {
  try {
    const next = JSON.stringify(inv);
    const prev = typeof device.getStoreValue === 'function' ? JSON.stringify(device.getStoreValue('endpoint_inventory') || null) : null;
    if (prev !== next && typeof device.setStoreValue === 'function') {
      const p = device.setStoreValue('endpoint_inventory', inv);
      if (p && typeof p.catch === 'function') { p.catch(() => {}); }
    }
  } catch (_e) { /* soft */ }
}

function attach(device, zclNode) {
  if (!device || !zclNode || !zclNode.endpoints) { return null; }
  const st = _st(device);
  if (st.done) { return st; }
  st.done = true;
  const inv = inventory(zclNode);
  st.gp = inv.gp;
  _persist(device, inv);
  const ids = Object.keys(inv.eps).map(Number);
  const mainEp = ids.length ? Math.min(...ids) : 1;
  for (const id of ids) {
    const ep = zclNode.endpoints[id];
    for (const [clusterName, rows] of Object.entries(ROUTES)) {
      const cluster = ep && ep.clusters && ep.clusters[clusterName];
      if (!cluster || typeof cluster.on !== 'function') { continue; }
      for (const [attr, capRoot, conv] of rows) {
        const evt = `attr.${attr}`;
        if (_hasListener(cluster, evt)) { continue; } // driver already handles it
        // WHY: on DP-controlled devices the root capability belongs to the DP path — a stray ZCL
        // report on the main EP must not fight it. Secondary-EP gangs keep their own capability.
        if (id === mainEp && _driverOwnsDp(device, capRoot)) { continue; }
        try {
          const fn = _route(device, st, id, mainEp, clusterName, cluster, attr, capRoot, conv);
          cluster.on(evt, fn);
          // P3023: keep the handle so release can remove the listener (closure holds the device).
          if (!st.offs) { st.offs = []; }
          if (st.offs.length < MAX_EPS * MAX_CLUSTERS * 4) { st.offs.push([cluster, evt, fn]); }
          st.attached++;
          if (st.routed.length < 32) { st.routed.push(`ep${id}.${clusterName}.${attr}`); }
        } catch (_e) { /* soft */ }
      }
    }
  }
  if (st.attached) { try { device.log?.(`[EP-COVERAGE] passive listeners: ${st.routed.join(', ')}${inv.gp ? ' | ep242 green power ignored' : ''}`); } catch (_e) { /* soft */ } }
  return st;
}

/** P3023: remove the passive listeners attach() added (onUninit / onDeleted). Idempotent. */
function detach(device) {
  const st = device && device._p3018ep;
  if (!st || !st.offs) { return 0; }
  let n = 0;
  for (const [cluster, evt, fn] of st.offs) {
    try {
      if (typeof cluster.removeListener === 'function') { cluster.removeListener(evt, fn); n++; } else if (typeof cluster.off === 'function') { cluster.off(evt, fn); n++; }
    } catch (_e) { /* soft */ }
  }
  st.offs = null;
  st.done = false;
  st.attached = 0;
  st.routed = [];
  return n;
}

function snapshot(device) {
  const st = device && device._p3018ep;
  if (!st) { return null; }
  return { attached: st.attached, routed: st.routed.slice(), gp: st.gp, unrouted: Object.fromEntries([...st.unrouted.entries()].slice(0, MAX_UNROUTED)) };
}

module.exports = { inventory, candidates, attach, detach, snapshot, ROUTES, GP_EP, MAX_EPS, MAX_CLUSTERS, MAX_UNROUTED };
