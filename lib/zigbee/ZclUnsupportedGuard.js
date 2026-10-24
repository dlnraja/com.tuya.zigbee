'use strict';

/**
 * P3011: ZclUnsupportedGuard — process-wide, per-device handling of "unsupported" outcomes at
 * the zigbee-clusters layer, so EVERY call site (455 drivers, lib managers, Flow actions)
 * benefits without being rewritten.
 *
 * Installed once from app.js (after custom clusters are registered). It wraps:
 *  - Cluster.prototype.readAttributes / writeAttributes / configureReporting and the
 *    cluster-specific command methods of every registered cluster class:
 *      · an op the device answered "unsupported by design" (UNSUPPORTED_ATTRIBUTE,
 *        UNSUP_*_COMMAND, UNSUPPORTED_CLUSTER, UNREPORTABLE_ATTRIBUTE, READ_ONLY for writes …,
 *        2.6 Error(status) or 3.9 ZCLError) is remembered per node + endpoint + cluster;
 *      · the next identical op is answered locally with the SAME error shape
 *        (`Error(<STATUS>)`, err.zclStatus/status set, err.cached = true) → no radio traffic,
 *        no 10 s wait, existing catch/fallback logic behaves exactly as before;
 *      · reads silently skip known-unsupported attributes (2.6 already omits them from the
 *        result, so the return shape is unchanged); absent attributes count as strikes;
 *      · writes inspect the writeAttributesResponse records (2.6 does not throw on them);
 *      · multi-attribute configureReporting failures are isolated once per session.
 *    Transient / timeout / unknown outcomes are NEVER cached.
 *    Entries expire (memory 12 h, persisted 7 d) so a firmware update is re-probed.
 *  - Endpoint.prototype.handleZCLFrame: incoming frames nobody implements are handed to
 *    UnknownCommandSink (diag + generic Flow trigger) and then rethrown so the device still
 *    gets the spec-correct Default Response.
 *
 * Persistence: when the device is linked (TuyaZigbeeDevice does it, or getRegistry() +
 * linkDevice()), marks go through UnsupportedRegistry (store 'zcl_unsupported_matrix',
 * label 'zcl:ep<N>.<cluster>'). Without a device the cache is memory-only.
 * Never throws from its own code: any internal error falls back to the original method.
 */

const { classifyZclError, ZCL_STATUS } = require('./ZclErrorKind');

const MEM_TTL_MS = 12 * 3600 * 1000;
const PERSIST_TTL_MS = 7 * 24 * 3600 * 1000;
const MAX_PER_NODE = 150;
const MISSING_STRIKES = 3;
const GUARDED = Symbol.for('tuya.p3011.guarded');

const state = { enabled: true, installed: false, Cluster: null, Endpoint: null, classes: new WeakSet(), stats: { skipped: 0, marked: 0, unknownIncoming: 0 } };
const nodeDevice = new WeakMap(); // ZCLNode → Homey device
const nodeCache = new WeakMap(); // ZCLNode → Map(key → {kind,status,statusName,at,count})
const nodeSoft = new WeakMap(); // ZCLNode → Map(key → strikes) (missing attrs, isolation done)

function linkDevice(device, zclNode) {
  try {
    if (device && zclNode && typeof zclNode === 'object') { nodeDevice.set(zclNode, device); }
  } catch (_e) { /* no-op */ }
}

/** @returns {Object|null} device linked to this ZCLNode */
function deviceFor(zclNode) {
  try { return (zclNode && nodeDevice.get(zclNode)) || null; } catch (_e) { return null; }
}

function _node(cluster) {
  if (!state.enabled) { return null; } // kill switch: every wrapper falls through to the original
  try { return (cluster && cluster._endpoint && cluster._endpoint._node) || null; } catch (_e) { return null; }
}
function _ep(cluster) {
  try { return cluster._endpoint && typeof cluster._endpoint._endpointId === 'number' ? cluster._endpoint._endpointId : 0; } catch (_e) { return 0; }
}
function _name(cluster) {
  try { return (cluster.constructor && cluster.constructor.NAME) || cluster.name || 'cluster'; } catch (_e) { return 'cluster'; }
}
function _label(cluster) { return `zcl:ep${_ep(cluster)}.${_name(cluster)}`; }

function _cache(node) {
  let m = nodeCache.get(node);
  if (!m) { m = new Map(); nodeCache.set(node, m); }
  return m;
}
function _soft(node) {
  let m = nodeSoft.get(node);
  if (!m) { m = new Map(); nodeSoft.set(node, m); }
  return m;
}
function _registry(node) {
  const device = node ? nodeDevice.get(node) : null;
  if (!device || device._destroyed) { return null; }
  try { return require('./UnsupportedRegistry').getRegistry(device); } catch (_e) { return null; }
}

/** @returns {{statusName:string,status:number}|null} cached by-design failure for this op */
function lookup(cluster, item) {
  const node = _node(cluster);
  if (!node) { return null; }
  const label = _label(cluster);
  const key = `${label}.${item}`;
  const m = _cache(node);
  const hit = m.get(key);
  const now = Date.now();
  if (hit) {
    if (now - hit.at < MEM_TTL_MS) { return hit; }
    m.delete(key);
  }
  const reg = _registry(node);
  if (reg) {
    try {
      const e = reg._load()[key];
      if (e && now - (e.lastAt || e.at || 0) < PERSIST_TTL_MS) {
        const statusName = e.status && ZCL_STATUS[e.status] !== undefined ? e.status : 'UNSUPPORTED_ATTRIBUTE';
        const v = { kind: 'unsupported', statusName, status: ZCL_STATUS[statusName], at: now, count: e.count || 1, persisted: true };
        m.set(key, v);
        return v;
      }
    } catch (_e) { /* no-op */ }
  }
  return null;
}

function remember(cluster, item, c) {
  const node = _node(cluster);
  if (!node || !c || !c.byDesign) { return; }
  const label = _label(cluster);
  const key = `${label}.${item}`;
  const m = _cache(node);
  if (m.has(key)) { m.get(key).count++; m.get(key).at = Date.now(); return; }
  if (m.size >= MAX_PER_NODE) { m.delete(m.keys().next().value); }
  const statusName = c.statusName || (c.kind === 'read_only' ? 'READ_ONLY' : 'UNSUPPORTED_ATTRIBUTE');
  m.set(key, { kind: c.kind, statusName, status: ZCL_STATUS[statusName], at: Date.now(), count: 1 });
  state.stats.marked++;
  const reg = _registry(node);
  // persisted entry keeps the status name so the cached error keeps its shape after a restart
  if (reg) { try { reg.mark(label, item, 'cached-reject', statusName); } catch (_e) { /* no-op */ } }
}

function cachedError(hit, what) {
  const e = new Error(hit.statusName || 'UNSUPPORTED_ATTRIBUTE');
  e.zclStatus = hit.statusName;
  e.status = hit.status;
  e.cached = true;
  e.unsupportedOp = what;
  state.stats.skipped++;
  return e;
}

function _clusterLevel(cluster) {
  return lookup(cluster, '@cluster');
}

function _rememberFailure(cluster, item, err, { write = false } = {}) {
  try {
    const c = classifyZclError(err);
    if (!c.byDesign) { return c; }
    if (c.status === 0xc3) { remember(cluster, '@cluster', c); return c; } // UNSUPPORTED_CLUSTER
    if (c.kind === 'read_only' && !write) { return c; }
    if (c.kind === 'write_only' && write) { return c; }
    remember(cluster, item, c);
    return c;
  } catch (_e) { return { kind: 'unknown', byDesign: false }; }
}

// ---------------------------------------------------------------------------------------------
function wrapRead(orig) {
  return async function guardedReadAttributes(attributeNames, opts) {
    let names; let skipped;
    try {
      if (!Array.isArray(attributeNames) || attributeNames.length === 0 || !_node(this)) { return orig.call(this, attributeNames, opts); }
      const cl = _clusterLevel(this);
      if (cl) { throw cachedError(cl, `${_name(this)}.read`); }
      names = []; skipped = [];
      for (const a of attributeNames) { (lookup(this, String(a)) ? skipped : names).push(a); }
      if (names.length === 0) { state.stats.skipped++; return {}; }
    } catch (e) {
      if (e && e.cached) { throw e; }
      return orig.call(this, attributeNames, opts);
    }
    let res;
    try {
      res = await orig.call(this, names, opts);
    } catch (err) {
      _rememberFailure(this, names.length === 1 ? String(names[0]) : '@read-batch', err);
      throw err;
    }
    try {
      if (res && typeof res === 'object') {
        const node = _node(this); const soft = _soft(node); const label = _label(this);
        for (const a of names) {
          const k = `${label}.${a}.missing`;
          if (res[a] === undefined) {
            const n = (soft.get(k) || 0) + 1;
            if (n >= MISSING_STRIKES) { soft.delete(k); remember(this, String(a), { kind: 'unsupported', byDesign: true, statusName: 'UNSUPPORTED_ATTRIBUTE', status: 0x86 }); } else { soft.set(k, n); }
            if (soft.size > MAX_PER_NODE) { soft.delete(soft.keys().next().value); }
          } else if (soft.has(k)) { soft.delete(k); }
        }
      }
    } catch (_e) { /* no-op */ }
    return res;
  };
}

function wrapWrite(orig) {
  return async function guardedWriteAttributes(attributes, opts) {
    let send; let blocked;
    try {
      if (!attributes || typeof attributes !== 'object' || !_node(this)) { return orig.call(this, attributes, opts); }
      const cl = _clusterLevel(this);
      if (cl) { throw cachedError(cl, `${_name(this)}.write`); }
      send = {}; blocked = [];
      for (const [k, v] of Object.entries(attributes)) {
        const hit = lookup(this, `${k}@write`) || lookup(this, k);
        if (hit) { blocked.push([k, hit]); } else { send[k] = v; }
      }
      if (blocked.length > 0 && Object.keys(send).length === 0) {
        if (blocked.length === 1) { throw cachedError(blocked[0][1], `${_name(this)}.${blocked[0][0]}@write`); }
        return { attributes: blocked.map(([k, h]) => ({ status: h.statusName, id: this._attrId(k) })) };
      }
    } catch (e) {
      if (e && e.cached) { throw e; }
      return orig.call(this, attributes, opts);
    }
    const names = Object.keys(send);
    let res;
    try {
      res = await orig.call(this, send, opts);
    } catch (err) {
      _rememberFailure(this, names.length === 1 ? `${names[0]}@write` : '@write-batch', err, { write: true });
      throw err;
    }
    try {
      const recs = res && Array.isArray(res.attributes) ? res.attributes : [];
      const byId = (this.constructor && this.constructor.attributesById) || {};
      for (const r of recs) {
        if (!r || r.status === 'SUCCESS' || r.status === 0) { continue; }
        const n = (byId[r.id] && byId[r.id].name) || (names.length === 1 ? names[0] : null);
        if (n) { _rememberFailure(this, `${n}@write`, { status: r.status, message: String(r.status) }, { write: true }); }
      }
      if (blocked.length > 0 && res && Array.isArray(res.attributes)) {
        for (const [k, h] of blocked) { res.attributes.push({ status: h.statusName, id: this._attrId(k) }); }
      }
    } catch (_e) { /* no-op */ }
    return res;
  };
}

function wrapReporting(orig) {
  return async function guardedConfigureReporting(attributes, opts) {
    let send; let blocked;
    try {
      if (!attributes || typeof attributes !== 'object' || !_node(this)) { return orig.call(this, attributes, opts); }
      const cl = _clusterLevel(this);
      if (cl) { throw cachedError(cl, `${_name(this)}.report`); }
      send = {}; blocked = [];
      for (const [k, v] of Object.entries(attributes)) {
        const hit = lookup(this, `${k}@report`) || lookup(this, k);
        if (hit) { blocked.push([k, hit]); } else { send[k] = v; }
      }
      if (Object.keys(send).length === 0 && blocked.length > 0) { throw cachedError(blocked[0][1], `${_name(this)}.${blocked[0][0]}@report`); }
    } catch (e) {
      if (e && e.cached) { throw e; }
      return orig.call(this, attributes, opts);
    }
    const names = Object.keys(send);
    try {
      await orig.call(this, send, opts);
    } catch (err) {
      const c = classifyZclError(err);
      if (!c.byDesign) { throw err; }
      if (c.status === 0xc3 || names.length === 1) {
        _rememberFailure(this, names.length === 1 ? `${names[0]}@report` : '@report', err);
        throw err;
      }
      // isolate once per session: 2.6 reports the first failing status without its attributeId
      const node = _node(this); const soft = _soft(node);
      const isoKey = `${_label(this)}.${names.sort().join(',')}.iso`;
      if (soft.has(isoKey)) { throw err; }
      soft.set(isoKey, 1);
      for (const n of names) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await orig.call(this, { [n]: send[n] }, opts);
        } catch (singleErr) {
          _rememberFailure(this, `${n}@report`, singleErr);
        }
      }
      throw err; // keep the original contract: caller still learns that something was rejected
    }
    if (blocked.length > 0) { throw cachedError(blocked[0][1], `${_name(this)}.${blocked[0][0]}@report`); }
    return undefined;
  };
}

function wrapCommand(orig, cmdName) {
  return async function guardedCommand(args, opts) {
    try {
      if (_node(this)) {
        const hit = _clusterLevel(this) || lookup(this, `cmd:${cmdName}`);
        if (hit) { throw cachedError(hit, `${_name(this)}.${cmdName}`); }
      }
    } catch (e) {
      if (e && e.cached) { throw e; }
    }
    try {
      return await orig.call(this, args, opts);
    } catch (err) {
      try {
        const c = classifyZclError(err);
        // only remote statuses: a local TypeError (bad args) must not poison the cache
        if (c.byDesign && c.status !== null && c.kind === 'unsupported') {
          if (c.status === 0xc3) { remember(this, '@cluster', c); } else { remember(this, `cmd:${cmdName}`, c); }
        }
      } catch (_e) { /* no-op */ }
      throw err;
    }
  };
}

function guardClusterClass(clusterClass) {
  try {
    if (!clusterClass || typeof clusterClass !== 'function' || state.classes.has(clusterClass)) { return false; }
    state.classes.add(clusterClass);
    const proto = clusterClass.prototype;
    const cmds = clusterClass.COMMANDS || {};
    for (const name of Object.keys(cmds)) {
      const def = cmds[name];
      if (!def || def.global) { continue; }
      const own = Object.getOwnPropertyDescriptor(proto, name);
      if (own && (typeof own.value !== 'function' || own.value[GUARDED] || own.writable === false)) { continue; }
      const orig = proto[name];
      if (typeof orig !== 'function' || orig[GUARDED]) { continue; }
      const w = wrapCommand(orig, name);
      w[GUARDED] = true;
      Object.defineProperty(proto, name, { value: w, writable: true, configurable: true, enumerable: false });
    }
    return true;
  } catch (_e) { return false; }
}

function guardAllRegistered() {
  const C = state.Cluster;
  if (!C || !C.clusters) { return 0; }
  let n = 0;
  for (const k of Object.keys(C.clusters)) { if (guardClusterClass(C.clusters[k])) { n++; } }
  return n;
}

function wrapHandleZCLFrame(orig) {
  return async function guardedHandleZCLFrame(clusterId, frame, meta, rawFrame) {
    try {
      return await orig.call(this, clusterId, frame, meta, rawFrame);
    } catch (err) {
      try {
        const c = classifyZclError(err);
        const unknown = state.enabled && (c.kind === 'unknown_incoming' || [0x81, 0x83, 0xc3].includes(c.status));
        if (unknown) {
          state.stats.unknownIncoming++;
          const device = nodeDevice.get(this._node);
          if (device) {
            const C = state.Cluster && state.Cluster.getCluster ? state.Cluster.getCluster(clusterId) : null;
            require('./UnknownCommandSink').record(device, {
              clusterId,
              clusterName: C ? C.NAME : null,
              cmdId: frame && frame.cmdId,
              data: frame && frame.data,
              endpoint: this._endpointId,
              manufacturerId: frame && frame.manufacturerId,
              direction: frame && frame.frameControl && frame.frameControl.directionToClient ? 'toClient' : 'toServer',
              reason: String(err && err.message || err).slice(0, 60),
            });
          }
        }
      } catch (_e) { /* diag only */ }
      throw err; // Endpoint.handleFrame answers with the spec Default Response, as before
    }
  };
}

/**
 * @param {Object} [zc] - zigbee-clusters module (tests inject one)
 * @returns {boolean}
 */
function install(zc) {
  try {
    const lib = zc || require('zigbee-clusters');
    const Cluster = lib.Cluster;
    if (!Cluster || !Cluster.prototype) { return false; }
    if (state.installed && state.Cluster === Cluster) { guardAllRegistered(); return true; }
    state.Cluster = Cluster;
    const P = Cluster.prototype;
    if (!P._attrId) {
      Object.defineProperty(P, '_attrId', {
        value(name) { try { const a = this.constructor.attributes[name]; return a ? a.id : 0xffff; } catch (_e) { return 0xffff; } },
        writable: true, configurable: true,
      });
    }
    for (const [m, wrap] of [['readAttributes', wrapRead], ['writeAttributes', wrapWrite], ['configureReporting', wrapReporting]]) {
      const orig = P[m];
      if (typeof orig === 'function' && !orig[GUARDED]) {
        const w = wrap(orig); w[GUARDED] = true;
        Object.defineProperty(P, m, { value: w, writable: true, configurable: true, enumerable: false });
      }
    }
    guardAllRegistered();
    // clusters registered later (custom Tuya clusters) are guarded on registration
    const origAdd = Cluster.addCluster;
    if (typeof origAdd === 'function' && !origAdd[GUARDED]) {
      const add = function guardedAddCluster(clusterClass, ...rest) {
        const r = origAdd.call(this, clusterClass, ...rest);
        try { guardClusterClass(clusterClass); } catch (_e) { /* no-op */ }
        return r;
      };
      add[GUARDED] = true;
      try { Cluster.addCluster = add; } catch (_e) { /* frozen → registered ones are still guarded */ }
    }
    const Endpoint = lib.Endpoint || (() => { try { return require('zigbee-clusters/lib/Endpoint'); } catch (_e) { return null; } })();
    if (Endpoint && Endpoint.prototype && typeof Endpoint.prototype.handleZCLFrame === 'function' && !Endpoint.prototype.handleZCLFrame[GUARDED]) {
      const w = wrapHandleZCLFrame(Endpoint.prototype.handleZCLFrame); w[GUARDED] = true;
      Endpoint.prototype.handleZCLFrame = w;
      state.Endpoint = Endpoint;
    }
    state.installed = true;
    return true;
  } catch (_e) {
    return false;
  }
}

/** Diag: cached entries for one node (bounded). */
function snapshot(zclNode) {
  const m = zclNode ? nodeCache.get(zclNode) : null;
  return { stats: Object.assign({}, state.stats), entries: m ? [...m.entries()].slice(0, 50).map(([k, v]) => Object.assign({ key: k }, v)) : [] };
}

/** Forget a node's cache (re-pair / firmware update). Persisted marks: UnsupportedRegistry.clear(). */
function forget(zclNode) {
  if (zclNode) { nodeCache.delete(zclNode); nodeSoft.delete(zclNode); }
}

/** Kill switch (app setting 'zcl_unsupported_guard' = false). */
function setEnabled(on) { state.enabled = on !== false; return state.enabled; }

module.exports = { install, setEnabled, linkDevice, deviceFor, lookup, snapshot, forget, guardClusterClass, MEM_TTL_MS, PERSIST_TTL_MS, MISSING_STRIKES, _state: state };
