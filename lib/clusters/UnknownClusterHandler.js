'use strict';

const { Cluster, BoundCluster, ZCLDataTypes } = require('zigbee-clusters');
const { EventEmitter } = require('events');

/**
 * UnknownClusterHandler - v5.8.19
 * Universal dynamic cluster registration for ANY Zigbee cluster.
 * 
 * TUYA MANUFACTURER CLUSTERS (from zigpy discussion #823):
 * - 0xE000 (57344): Button/scene events (TS004X remotes, plugs)
 * - 0xE001 (57345): Switch mode (0xD010=power-on, 0xD030=switch mode)
 * - 0xE002 (57346): Sensor alarms (temp/humidity min/max)
 * - 0xEF00 (61184): Tuya DP protocol
 * - 0xFD02 (64770): Switch modules
 * - 0xFCC0 (64704): Xiaomi/Aqara specific
 */

const registeredClusters = new Set();
const clusterEmitters = new Map();

function getEmitter(id) {
  if (!clusterEmitters.has(id)) clusterEmitters.set(id, new EventEmitter());
  return clusterEmitters.get(id);
}

function createCluster(id) {
  const n = `dyn_${id.toString(16)}`;
  return class extends Cluster {
    static get ID() { return id; }
    static get NAME() { return n; }
    static get ATTRIBUTES() { return {}; }
    static get COMMANDS() {
      return { cmd: { id: 0, args: { d: ZCLDataTypes.buffer } } };
    }
  };
}

class DynBound extends BoundCluster {
  constructor(id, dev) { super(); this.id = id; this.dev = dev; this.em = getEmitter(id); }
  async handleFrame(f, m, r) {
    const cmd = f?.cmdId ?? 0, d = f?.data || r;
    if (this.dev?.log) this.dev.log(`[DYN-0x${this.id.toString(16)}] cmd:${cmd}`);
    this.em.emit('frame', { id: this.id, cmd, d, f, m, r, ts: Date.now() });
    this.em.emit(`cmd-${cmd}`, { id: this.id, d });
    return null;
  }
}

function register(id) {
  if (registeredClusters.has(id)) return true;
  try {
    Cluster.addCluster(createCluster(id));
    registeredClusters.add(id);
    return true;
  } catch { return false; }
}

function scanAndBind(zclNode, dev) {
  if (!zclNode?.endpoints) return [];
  const bound = [];
  for (const [epId, ep] of Object.entries(zclNode.endpoints)) {
    const clusters = ep.inputClusters || [];
    for (const cid of clusters) {
      if (cid >= 0xFC00 || [0xEF00, 0xE000, 0xE001, 0xED00].includes(cid)) {
        if (register(cid)) {
          try { ep.bind?.(cid, new DynBound(cid, dev)); bound.push({ ep: epId, cid }); } catch {}
        }
      }
    }
  }
  return bound;
}

module.exports = { register, getEmitter, DynBound, scanAndBind, registeredClusters };
