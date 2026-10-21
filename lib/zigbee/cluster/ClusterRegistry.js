'use strict';

/**
 * ClusterRegistry — idempotent, order-independent cluster registration.
 *
 * Problem found (audit 2026-10-21): zigbee-clusters' Cluster.addCluster() is
 * "last write wins" on both ID and NAME. ~45 driver modules call
 * Cluster.addCluster() at require time, and 26 of them register the LEGACY
 * lib/TuyaSpecificCluster.js (11 commands) over the canonical
 * lib/clusters/TuyaSpecificCluster.js (20 commands: mcuSyncTime, sceneWakeup,
 * dpStatusUpdate, 0x0B-0x0F...). Depending on load order the richer class was
 * silently replaced.
 *
 * Fix (additive): install() wraps Cluster.addCluster once. A second class for
 * an already-registered ID is MERGED: the richer class is kept as base, and
 * any command/attribute name only known by the other one is grafted on.
 * Incoming dispatch is by id and the base entries come first, so the existing
 * behaviour of the richer class is preserved; legacy names (timeSync,
 * reporting_0x05) keep working for sending.
 *
 * Also grafts commands missing from zigbee-clusters 2.6 standard clusters
 * (pollControl checkIn/checkInResponse, ota client commands), per ZCL spec
 * (07-5123) and zigbee-herdsman's cluster definitions — rewritten here.
 */

const MAX_LOG = 30;

const state = {
  installed: false,
  original: null,
  log: [],
  merges: 0,
  skips: 0,
  registrations: 0,
};

function _push(msg) {
  if (state.log.length >= MAX_LOG) state.log.shift();
  state.log.push(msg);
}

function _count(C) {
  try { return Object.keys(C.COMMANDS || {}).length + Object.keys(C.ATTRIBUTES || {}).length; } catch (e) { return 0; }
}

function _merge(Base, Other) {
  const baseCmds = Base.COMMANDS || {};
  const baseAttrs = Base.ATTRIBUTES || {};
  const addCmds = {};
  const addAttrs = {};
  const aliases = {};
  const sig = c => `${c.id}|${c.direction || ''}|${c.manufacturerId || ''}`;
  const baseBySig = {};
  for (const [k, v] of Object.entries(baseCmds)) if (v && !baseBySig[sig(v)]) baseBySig[sig(v)] = k;
  for (const [k, v] of Object.entries(Other.COMMANDS || {})) {
    if (k in baseCmds || !v) continue;
    // Same id+direction already known: zigbee-clusters dispatches the LAST
    // duplicate, so adding it would hijack incoming frames. Alias for sending only.
    if (baseBySig[sig(v)]) aliases[k] = baseBySig[sig(v)];
    else addCmds[k] = v;
  }
  for (const [k, v] of Object.entries(Other.ATTRIBUTES || {})) {
    if (k in baseAttrs) continue;
    // never graft an attribute whose id already exists under another name
    if (Object.values(baseAttrs).some(a => a && a.id === v.id)) continue;
    addAttrs[k] = v;
  }
  if (!Object.keys(addCmds).length && !Object.keys(addAttrs).length && !Object.keys(aliases).length) return Base;
  const cmds = Object.assign({}, baseCmds, addCmds);
  const attrs = Object.assign({}, baseAttrs, addAttrs);
  class Merged extends Base {
    static get COMMANDS() { return cmds; }
    static get ATTRIBUTES() { return attrs; }
  }
  for (const [alias, target] of Object.entries(aliases)) {
    // never shadow a real method of the base class (e.g. canonical timeSync())
    if (!(alias in Base.prototype)) Object.defineProperty(Merged.prototype, alias, {
      value(args, opts) { return this[target](args, opts); }, writable: true, configurable: true,
    });
    // Keep legacy event names alive: listeners of 'timeSync' still hear it
    // when the frame is dispatched as mcuSyncTime.
    const cap = n => `on${n.charAt(0).toUpperCase()}${n.slice(1)}`;
    const onT = cap(target);
    const baseOn = Object.prototype.hasOwnProperty.call(Merged.prototype, onT) ? Merged.prototype[onT] : Base.prototype[onT];
    Object.defineProperty(Merged.prototype, onT, {
      value(...a) {
        const r = typeof baseOn === 'function' ? baseOn.apply(this, a) : undefined;
        try {
          if (typeof this.emit === 'function' && (!this.listenerCount || this.listenerCount(alias) > 0)) this.emit(alias, a[0]);
        } catch (e) { /* listener errors must not break dispatch */ }
        return r;
      },
      writable: true, configurable: true,
    });
  }
  Object.defineProperty(Merged, 'name', { value: `${Base.name || 'Cluster'}Merged` });
  Merged.__mergedFrom = [Base.__mergedFrom ? Base.__mergedFrom : Base, Other];
  Merged.__grafted = { commands: Object.keys(addCmds), attributes: Object.keys(addAttrs), aliases };
  return Merged;
}

function _getCluster() {
  // eslint-disable-next-line global-require
  return require('zigbee-clusters').Cluster;
}

/** Register through the guard (works even before install()). */
function register(ClusterClass, source = '?') {
  const Cluster = _getCluster();
  const add = state.original || Cluster.addCluster.bind(Cluster);
  if (!ClusterClass || ClusterClass.ID === undefined || !ClusterClass.NAME) {
    _push(`skip invalid from ${source}`);
    return null;
  }
  const existing = Cluster.clusters[ClusterClass.ID];
  if (existing === ClusterClass || (existing && existing.__mergedFrom && existing.__mergedFrom.includes(ClusterClass))) {
    state.skips++;
    return existing;
  }
  if (!existing) {
    state.registrations++;
    add(ClusterClass);
    return ClusterClass;
  }
  // Same ID, different class: merge, richer one is the base.
  const [base, other] = _count(ClusterClass) > _count(existing) ? [ClusterClass, existing] : [existing, ClusterClass];
  const merged = _merge(base, other);
  if (merged !== existing) {
    state.merges++;
    _push(`merge 0x${ClusterClass.ID.toString(16)} ${existing.NAME}<-${ClusterClass.NAME} (${source})`);
    add(merged);
    // keep a different NAME reachable too (never steal another cluster's name)
    if (other.NAME !== merged.NAME && !Cluster.clusters[other.NAME]) Cluster.clusters[other.NAME] = merged;
  } else {
    state.skips++;
  }
  return merged;
}

/** Patch Cluster.addCluster once so every caller goes through the guard. */
function install() {
  if (state.installed) return false;
  const Cluster = _getCluster();
  state.original = Cluster.addCluster.bind(Cluster);
  Cluster.addCluster = function guardedAddCluster(C) { return register(C, 'addCluster'); };
  state.installed = true;
  graftStandard();
  return true;
}

/** Additive grafts for standard clusters whose 2.6 definition misses commands. */
function graftStandard() {
  const { Cluster, ZCLDataTypes: T } = require('zigbee-clusters');
  const extra = {
    // zigbee-clusters 2.6 scenes has NO commands: lib/clusters/ScenesBoundCluster.recall()
    // could never be dispatched. Names match that class (recall/store/remove).
    scenes: {
      view: { id: 0x01, args: { groupId: T.uint16, sceneId: T.uint8 } },
      remove: { id: 0x02, args: { groupId: T.uint16, sceneId: T.uint8 } },
      store: { id: 0x04, args: { groupId: T.uint16, sceneId: T.uint8 } },
      recall: { id: 0x05, args: { groupId: T.uint16, sceneId: T.uint8 } },
    },
    pollControl: {
      checkIn: { id: 0x00, direction: 'DIRECTION_SERVER_TO_CLIENT' },
      checkInResponse: { id: 0x00, direction: 'DIRECTION_CLIENT_TO_SERVER', args: { startFastPolling: T.bool, fastPollTimeout: T.uint16 } },
    },
    ota: {
      imageNotify: { id: 0x00, args: { payloadType: T.uint8, queryJitter: T.uint8 } },
      queryNextImageRequest: { id: 0x01, args: { fieldControl: T.uint8, manufacturerCode: T.uint16, imageType: T.uint16, fileVersion: T.uint32 } },
      imageBlockRequest: { id: 0x03, args: { fieldControl: T.uint8, manufacturerCode: T.uint16, imageType: T.uint16, fileVersion: T.uint32, fileOffset: T.uint32, maximumDataSize: T.uint8 } },
      upgradeEndRequest: { id: 0x06, args: { status: T.uint8, manufacturerCode: T.uint16, imageType: T.uint16, fileVersion: T.uint32 } },
    },
  };
  for (const [name, cmds] of Object.entries(extra)) {
    const C = Cluster.clusters[name];
    if (!C) continue;
    const missing = Object.keys(cmds).filter(k => !(k in (C.COMMANDS || {})));
    if (!missing.length) continue;
    const add = {};
    for (const k of missing) {
      const def = Object.assign({}, cmds[k]);
      if (def.direction) def.direction = Cluster[def.direction] || def.direction;
      add[k] = def;
    }
    class Graft extends C {}
    Object.defineProperty(Graft, 'COMMANDS', { get: () => Object.assign({}, C.COMMANDS, add) });
    register(Graft, `graft:${name}`);
  }
}

function stats() {
  return { installed: state.installed, registrations: state.registrations, merges: state.merges, skips: state.skips, log: state.log.slice() };
}

function _resetForTests() {
  if (state.installed && state.original) _getCluster().addCluster = state.original;
  Object.assign(state, { installed: false, original: null, log: [], merges: 0, skips: 0, registrations: 0 });
}

module.exports = { install, register, stats, graftStandard, _merge, _resetForTests, MAX_LOG };
