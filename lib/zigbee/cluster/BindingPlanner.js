'use strict';

/**
 * BindingPlanner — bind the client (output) clusters a device uses to talk to
 * Homey, on EVERY endpoint that declares them, with bounded retries.
 *
 * - Targets: outputClusters from the node descriptor ∩ BINDABLE (remotes,
 *   switches in scene mode, sensors pushing reports).
 * - Sleepy devices: failed binds are queued and retried on the next wake
 *   (`onWake()`), max MAX_ATTEMPTS per pair.
 * - Storm guard: per-pair cooldown and a global per-device budget, so a
 *   device that reconnects in a loop cannot trigger a rebind storm.
 * Same idea as zigbee-herdsman's bind-on-configure and ZHA's "bind on
 * join, retry when awake", rewritten for Homey's ep.clusters[x].bind().
 */

const BINDABLE = ['onOff', 'levelControl', 'scenes', 'colorControl', 'windowCovering', 'iasZone', 'iasACE',
  'ota', 'pollControl', 'groups', 'multistateInput', 'powerConfiguration', 'temperatureMeasurement',
  'relativeHumidity', 'occupancySensing', 'illuminanceMeasurement', 'electricalMeasurement', 'metering'];

const MAX_ATTEMPTS = 3;
const COOLDOWN_MS = 10 * 60 * 1000;
const MAX_PER_DEVICE = 24;

class BindingPlanner {
  constructor({ now = () => Date.now(), log } = {}) {
    this._now = now; this._log = log;
    this._pairs = new Map(); // "ep:cluster" -> { attempts, last, ok }
    this._spent = 0;
  }

  plan(zclNode, nodeDescriptor) {
    const out = [];
    const eps = (nodeDescriptor && nodeDescriptor.endpoints) || [];
    for (const e of eps) {
      const id = e.endpointId !== undefined ? e.endpointId : e.id;
      for (const cid of (e.outputClusters || [])) {
        const name = typeof cid === 'string' ? cid : _nameOf(cid);
        if (name && BINDABLE.includes(name)) out.push({ ep: Number(id), cluster: name });
      }
    }
    // No descriptor output => nothing to bind (never guess: avoids rebinding server clusters).
    return out;
  }

  _due(key) {
    const s = this._pairs.get(key);
    if (!s) return true;
    if (s.ok) return false;
    if (s.attempts >= MAX_ATTEMPTS) return false;
    if (s.attempts === 0) return true;
    return this._now() - s.last >= COOLDOWN_MS || s.wakeRetry;
  }

  async run(zclNode, nodeDescriptor, { wake = false } = {}) {
    const res = { bound: [], failed: [], skipped: [] };
    for (const { ep, cluster } of this.plan(zclNode, nodeDescriptor)) {
      const key = `${ep}:${cluster}`;
      const s = this._pairs.get(key) || { attempts: 0, last: 0, ok: false };
      if (wake && !s.ok) s.wakeRetry = true;
      this._pairs.set(key, s);
      if (!this._due(key) || this._spent >= MAX_PER_DEVICE) { res.skipped.push(key); continue; }
      const c = zclNode && zclNode.endpoints && zclNode.endpoints[ep] && zclNode.endpoints[ep].clusters[cluster];
      if (!c || typeof c.bind !== 'function') { res.skipped.push(key); continue; }
      s.attempts++; s.last = this._now(); s.wakeRetry = false; this._spent++;
      try { await c.bind(); s.ok = true; res.bound.push(key); } catch (e) { res.failed.push(key); }
    }
    return res;
  }

  /** Call on any sign of life from a sleepy device. */
  onWake(zclNode, nodeDescriptor) { return this.run(zclNode, nodeDescriptor, { wake: true }); }

  snapshot() { return { spent: this._spent, pairs: Object.fromEntries(this._pairs) }; }
}

function _nameOf(id) {
  try { const C = require('zigbee-clusters').Cluster.getCluster(Number(id)); return C && C.NAME; } catch (e) { return null; }
}

module.exports = { BindingPlanner, BINDABLE, MAX_ATTEMPTS, COOLDOWN_MS, MAX_PER_DEVICE };
