'use strict';

/**
 * RoutedBoundCluster — one BoundCluster factory for every client-side
 * command a device sends to Homey (onOff, levelControl, scenes, colorControl,
 * windowCovering, iasZone, iasACE, ota, time, pollControl, groups, and the
 * Tuya custom clusters once registered).
 *
 * Each command defined on the cluster becomes a method that forwards a
 * normalised event { cluster, clusterId, command, cmdId, args, endpoint } to
 * `route(evt)` (the button router or any handler). A command the definition
 * does not know is NOT rejected: it is captured as { command: 'raw', cmdId,
 * data } and routed too, then acknowledged. Logs are rate-bounded.
 *
 * Pattern from Athom's BoundCluster docs and Johan's apps (one class per
 * cluster); generalised here so no command is ever silently dropped.
 */

const { BoundCluster, Cluster } = require('zigbee-clusters');

const DEFAULT_CLUSTERS = ['onOff', 'levelControl', 'scenes', 'colorControl', 'windowCovering',
  'iasZone', 'iasACE', 'ota', 'time', 'pollControl', 'groups'];

const LOG_BUDGET = 20; // per instance

// P3011: one matcher for the 2.6 ('unknown_command_received') AND 3.9 forms
// (ZCLError UNSUP_CLUSTER_COMMAND / 'unknown_command_received:<name>' / 'not_implemented').
function isUnknownCommandError(err) {
  if (!err) {return false;}
  try { return require('../ZclErrorKind').isUnknownIncomingError(err); } catch (e) {
    return String(err && err.message).startsWith('unknown_command_received');
  }
}

function makeRoutedBoundCluster(clusterName, { route, log, extraHandlers, onUnknown } = {}) {
  const C = Cluster.getCluster(clusterName);
  if (!C) {return null;}

  class Routed extends BoundCluster {
    constructor(endpointId) {
      super();
      this._ep = endpointId;
      this._logLeft = LOG_BUDGET;
      this.stats = { routed: 0, raw: 0, errors: 0 };
    }

    _log(...a) {
      if (!log || this._logLeft <= 0) {return;}
      this._logLeft--;
      try { log(`[ROUTED-BOUND:${clusterName}]`, ...a); } catch (e) { /* ignore */ }
    }

    _emit(evt) {
      if (typeof route !== 'function') {return undefined;}
      try {
        const r = route(Object.assign({ cluster: clusterName, clusterId: C.ID, endpoint: this._ep }, evt));
        if (r && typeof r.catch === 'function') {r.catch(e => { this.stats.errors++; this._log('route err', e && e.message); });}
        return r;
      } catch (e) {
        this.stats.errors++;
        this._log('route err', e && e.message);
        return undefined;
      }
    }

    async handleFrame(frame, meta, rawFrame) {
      try {
        return await super.handleFrame(frame, meta, rawFrame);
      } catch (err) {
        if (!isUnknownCommandError(err)) {throw err;}
        this.stats.raw++;
        this._log('unknown cmd', frame && frame.cmdId);
        this._emit({ command: 'raw', cmdId: frame && frame.cmdId, data: frame && frame.data, manufacturerId: frame && frame.manufacturerId });
        // P3011: diag + generic Flow trigger (tuya_cluster_received), never throws
        if (typeof onUnknown === 'function') {
          try {
            onUnknown({
              clusterId: C.ID, clusterName, cmdId: frame && frame.cmdId, data: frame && frame.data,
              endpoint: this._ep, manufacturerId: frame && frame.manufacturerId, reason: 'routed_raw',
            });
          } catch (e) { /* diag only */ }
        }
        return undefined; // acknowledged: default success response
      }
    }
  }

  for (const [name, def] of Object.entries(C.COMMANDS || {})) {
    if (def && def.isResponse) {continue;}
    if (extraHandlers && typeof extraHandlers[name] === 'function') {
      Routed.prototype[name] = extraHandlers[name];
      continue;
    }
    Routed.prototype[name] = function routedCommand(args) {
      this.stats.routed++;
      this._emit({ command: name, cmdId: def.id, args: args || {} });
      return undefined;
    };
  }
  Object.defineProperty(Routed, 'name', { value: `Routed_${clusterName}` });
  return Routed;
}

/**
 * Bind routed bound clusters on every endpoint that exposes the cluster as
 * an output (client) cluster per the node descriptor. Never replaces an
 * existing binding (additive): drivers' own BoundClusters keep priority.
 */
function bindAll(zclNode, { route, log, clusters = DEFAULT_CLUSTERS, onlyIfMissing = true } = {}) {
  const done = [];
  if (!zclNode || !zclNode.endpoints) {return done;}
  // P3011: unknown commands also reach the device's Flow trigger + diag ring
  const onUnknown = (evt) => {
    try {
      const device = require('../ZclUnsupportedGuard').deviceFor(zclNode);
      if (device) {require('../UnknownCommandSink').record(device, evt);}
    } catch (e) { /* diag only */ }
  };
  for (const [epId, ep] of Object.entries(zclNode.endpoints)) {
    for (const name of clusters) {
      if (onlyIfMissing && ep.bindings && ep.bindings[name]) {continue;}
      const Routed = makeRoutedBoundCluster(name, { route, log, onUnknown });
      if (!Routed) {continue;}
      try { ep.bind(name, new Routed(Number(epId))); done.push(`${epId}:${name}`); } catch (e) { /* endpoint refuses: ignore */ }
    }
  }
  return done;
}

module.exports = { makeRoutedBoundCluster, bindAll, isUnknownCommandError, DEFAULT_CLUSTERS, LOG_BUDGET };
