'use strict';

const { Cluster, BoundCluster, ZCLDataTypes } = require('zigbee-clusters');
const { EventEmitter } = require('events');

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
