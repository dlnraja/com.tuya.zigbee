'use strict';

const { CLUSTERS } = require('../constants/ZigbeeConstants.js');


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
 * - CLUSTERS.TUYA_EF00 (CLUSTERS.TUYA_EF00): Tuya DP protocol
 * - 0xFD02 (64770): Switch modules
 * - 0xFCC0 (64704): Xiaomi/Aqara specific
 */

// A8: NaN Safety - use safeDivide/safeMultiply
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
    try {
      const cmd = f?.cmdId ?? 0, d = f?.data || r;if (this.dev?.log) this.dev.log(`[DYN-0x${this.id.toString(16)}] cmd:${cmd}`);
      this.em.emit('frame', { id: this.id, cmd, d, f, m, r, ts: Date.now() });
      this.em.emit(`cmd-${cmd}`, { id: this.id, d });
    } catch (err) {
      if (this.dev?.log) this.dev.log(`[DYN-0x${this.id.toString(16)}] FRAME SAVED:`, err.message);
    }
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

// Standard ZCL cluster IDs that Homey handles natively  never dynamically bind
const STANDARD_SKIP = new Set([
  0x0000,0x0001,0x0003,0x0004,0x0005,0x0006,0x0008,0x000A,
  0x0019,0x0020,0x0021,0x0100,0x0101,0x0102,
  0x0201,0x0202,0x0204,0x0300,0x0400,0x0402,0x0403,0x0405,
  0x0406,0x0500,0x0501,0x0502,0x0702,0x0B04,0x0B05,
  CLUSTERS.TUYA_EF00, // TuyaSpecificCluster (dedicated handler)
]);

function shouldDynBind(cid) {
  if (STANDARD_SKIP.has(cid)) return false;
  if (cid >= 0xE000) return true;          // Manufacturer-specific range
  if (registeredClusters.has(cid)) return true; // Pre-registered exotic (e.g. 0x1888)
  if (cid >= 0x1000 && cid <= 0xDFFF) return true; // Non-standard range
  return false;
}

function scanAndBind(zclNode, dev) {
  if (!zclNode?.endpoints) return [];
  const bound = [];
  for (const [epId, ep] of Object.entries(zclNode.endpoints)) {
    const clusters = ep.inputClusters || [];
    for (const cid of clusters) {
      if (shouldDynBind(cid)) {
        if (register(cid)) {
          try { ep.bind?.(cid, new DynBound(cid, dev)); bound.push({ ep: epId, cid }); } catch {}
        }
      }
    }
  }
  return bound;
}

module.exports = { register, getEmitter, DynBound, scanAndBind, registeredClusters };


