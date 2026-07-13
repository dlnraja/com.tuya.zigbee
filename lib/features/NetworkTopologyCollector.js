'use strict';

/**
 * NetworkTopologyCollector - Zigbee Mesh Topology Mapping
 * FEATURE #87
 *
 * Collects and maps the Zigbee mesh network topology:
 *   - Device neighbor discovery
 *   - Router/end-device classification
 *   - Signal path quality analysis
 *   - Mesh connectivity graph construction
 *   - Coverage gap detection
 *   - Dead-end device identification
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class NetworkTopologyCollector extends EventEmitter {
  constructor(homey, options = {}) {
    super();
    this.homey = homey;
    this._destroyed = false;

    // Topology data
    this.coordinatorAddr = options.coordinatorAddr || null;
    this.devices = new Map(); // ieeeAddr -> DeviceNode
    this.neighbors = new Map(); // ieeeAddr -> [{ neighborAddr, lqi, relationship }]

    // Network statistics
    this.stats = {
      totalDevices: 0,
      routers: 0,
      endDevices: 0,
      coordinators: 0,
      averageLQI: 0,
      maxDepth: 0,
      orphanedDevices: 0,
      coverageScore: 100,
      lastScanTimestamp: 0
    };

    // History
    this._scanHistory = [];
    this._maxScanHistory = options.maxScanHistory || 50;
  }

  /* ------------------------------------------------------------------ */
  /*  Device registration                                                */
  /* ------------------------------------------------------------------ */

  /**
   * Register or update a device in the topology.
   *
   * @param {Object} info
   * @param {string} info.ieeeAddr      - IEEE address
   * @param {string} [info.networkAddr] - NWK address
   * @param {string} info.type          - 'coordinator', 'router', 'end_device'
   * @param {string} [info.modelId]
   * @param {string} [info.manufacturerName]
   * @param {number} [info.rssi]
   * @param {number} [info.lqi]
   * @param {number} [info.depth]       - Network depth (0 = coordinator)
   * @param {string} [info.parentAddr]  - Parent device IEEE address
   * @param {string} [info.endpoint]    - Primary endpoint
   */
  registerDevice(info) {
    if (this._destroyed || !info.ieeeAddr) return;

    const existing = this.devices.get(info.ieeeAddr);
    const node = {
      ieeeAddr: info.ieeeAddr,
      networkAddr: info.networkAddr || existing?.networkAddr || null,
      type: info.type || existing?.type || 'end_device',
      modelId: info.modelId || existing?.modelId || null,
      manufacturerName: info.manufacturerName || existing?.manufacturerName || null,
      rssi: info.rssi ?? existing?.rssi ?? null,
      lqi: info.lqi ?? existing?.lqi ?? null,
      depth: info.depth ?? existing?.depth ?? null,
      parentAddr: info.parentAddr || existing?.parentAddr || null,
      endpoint: info.endpoint || existing?.endpoint || null,
      firstSeen: existing?.firstSeen || Date.now(),
      lastSeen: Date.now(),
      hopCount: info.depth ?? 0
    };

    this.devices.set(info.ieeeAddr, node);
    this._updateStats();
  }

  /**
   * Record neighbor information for a device.
   *
   * @param {string} ieeeAddr - Source device
   * @param {Array<Object>} neighborList
   * @param {string} neighborList[].addr - Neighbor IEEE address
   * @param {number} neighborList[].lqi   - Link quality indicator
   * @param {string} neighborList[].relationship - 'parent', 'child', 'sibling', 'unknown'
   */
  recordNeighbors(ieeeAddr, neighborList) {
    if (this._destroyed || !ieeeAddr) return;

    this.neighbors.set(ieeeAddr, neighborList.map(n => ({
      neighborAddr: n.addr,
      lqi: n.lqi || 0,
      relationship: n.relationship || 'unknown',
      timestamp: Date.now()
    })));
  }

  /**
   * Record signal quality for a device.
   * @param {string} ieeeAddr
   * @param {number} rssi
   * @param {number} lqi
   */
  recordSignal(ieeeAddr, rssi, lqi) {
    const device = this.devices.get(ieeeAddr);
    if (!device) return;

    device.rssi = rssi;
    device.lqi = lqi;
    device.lastSeen = Date.now();
  }

  /* ------------------------------------------------------------------ */
  /*  Topology queries                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Get the full topology as a graph structure.
   * @returns {Object} { nodes, edges }
   */
  getTopologyGraph() {
    const nodes = [];
    const edges = [];

    for (const [ieeeAddr, device] of this.devices) {
      nodes.push({
        id: ieeeAddr,
        type: device.type,
        modelId: device.modelId,
        depth: device.depth,
        lqi: device.lqi,
        rssi: device.rssi
      });

      // Add edge to parent
      if (device.parentAddr && this.devices.has(device.parentAddr)) {
        edges.push({
          source: device.parentAddr,
          target: ieeeAddr,
          lqi: device.lqi,
          type: device.type
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * Find the shortest path between two devices.
   * @param {string} fromAddr
   * @param {string} toAddr
   * @returns {Array<string>} Path of IEEE addresses
   */
  findPath(fromAddr, toAddr) {
    if (fromAddr === toAddr) return [fromAddr];

    const visited = new Set();
    const queue = [[fromAddr]];
    visited.add(fromAddr);

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      // Get all connected devices (neighbors + parent)
      const connected = this._getConnectedDevices(current);

      for (const next of connected) {
        if (next === toAddr) return [...path, next];
        if (!visited.has(next)) {
          visited.add(next);
          queue.push([...path, next]);
        }
      }
    }

    return []; // No path found
  }

  /**
   * Find devices that may be orphaned (no parent in topology).
   * @returns {Array}
   */
  findOrphanedDevices() {
    const orphans = [];
    for (const [ieeeAddr, device] of this.devices) {
      if (device.type === 'coordinator') continue;
      if (device.parentAddr && !this.devices.has(device.parentAddr)) {
        orphans.push(device);
      }
      if (!device.parentAddr && device.type === 'end_device') {
        orphans.push(device);
      }
    }
    return orphans;
  }

  /**
   * Find weak signal devices (low LQI or poor RSSI).
   * @param {number} [lqiThreshold=50]
   * @param {number} [rssiThreshold=-85]
   * @returns {Array}
   */
  findWeakSignalDevices(lqiThreshold = 50, rssiThreshold = -85) {
    const weak = [];
    for (const [, device] of this.devices) {
      if (device.type === 'coordinator') continue;
      if ((device.lqi !== null && device.lqi < lqiThreshold) ||
          (device.rssi !== null && device.rssi < rssiThreshold)) {
        weak.push(device);
      }
    }
    return weak;
  }

  /**
   * Get router coverage analysis.
   * @returns {Object}
   */
  getRouterCoverage() {
    const routers = Array.from(this.devices.values()).filter(d => d.type === 'router' || d.type === 'coordinator');
    const endDevices = Array.from(this.devices.values()).filter(d => d.type === 'end_device');

    let connectedDevices = 0;
    let disconnectedDevices = 0;

    for (const ed of endDevices) {
      if (ed.parentAddr && this.devices.has(ed.parentAddr)) {
        connectedDevices++;
      } else {
        disconnectedDevices++;
      }
    }

    return {
      routerCount: routers.length,
      endDeviceCount: endDevices.length,
      connectedEndDevices: connectedDevices,
      disconnectedEndDevices: disconnectedDevices,
      coveragePercent: endDevices.length > 0
        ? Math.round((connectedDevices / endDevices.length) * 100)
        : 100,
      routersPerEndDevice: endDevices.length > 0
        ? Math.round((routers.length / endDevices.length) * 100) / 100
        : Infinity
    };
  }

  /**
   * Get devices by depth level.
   * @returns {Object} depth -> [devices]
   */
  getDepthMap() {
    const depthMap = {};
    for (const [, device] of this.devices) {
      const d = device.depth ?? -1;
      if (!depthMap[d]) depthMap[d] = [];
      depthMap[d].push({
        ieeeAddr: device.ieeeAddr,
        type: device.type,
        modelId: device.modelId
      });
    }
    return depthMap;
  }

  /**
   * Get a specific device node.
   * @param {string} ieeeAddr
   * @returns {Object|null}
   */
  getDevice(ieeeAddr) {
    return this.devices.get(ieeeAddr) || null;
  }

  /**
   * Get all device entries.
   * @returns {Array}
   */
  getAllDevices() {
    return Array.from(this.devices.values());
  }

  /**
   * Get network statistics.
   * @returns {Object}
   */
  getStats() {
    return { ...this.stats };
  }

  /* ------------------------------------------------------------------ */
  /*  Internal                                                           */
  /* ------------------------------------------------------------------ */

  _getConnectedDevices(ieeeAddr) {
    const connected = new Set();

    // Parent
    const device = this.devices.get(ieeeAddr);
    if (device?.parentAddr) connected.add(device.parentAddr);

    // Children (devices whose parent is this one)
    for (const [addr, d] of this.devices) {
      if (d.parentAddr === ieeeAddr) connected.add(addr);
    }

    // Neighbors
    const neighbors = this.neighbors.get(ieeeAddr);
    if (neighbors) {
      for (const n of neighbors) {
        connected.add(n.neighborAddr);
      }
    }

    return Array.from(connected);
  }

  _updateStats() {
    let routers = 0;
    let endDevices = 0;
    let coordinators = 0;
    let totalLQI = 0;
    let lqiCount = 0;
    let maxDepth = 0;

    for (const [, device] of this.devices) {
      switch (device.type) {
      case 'router': routers++; break;
      case 'end_device': endDevices++; break;
      case 'coordinator': coordinators++; break;
      }
      if (device.lqi !== null) {
        totalLQI += device.lqi;
        lqiCount++;
      }
      if (device.depth !== null && device.depth > maxDepth) {
        maxDepth = device.depth;
      }
    }

    const orphaned = this.findOrphanedDevices().length;
    const total = this.devices.size;
    const coverageScore = total > 0
      ? Math.round(((total - orphaned) / total) * 100)
      : 100;

    this.stats = {
      totalDevices: total,
      routers,
      endDevices,
      coordinators,
      averageLQI: lqiCount > 0 ? Math.round(totalLQI / lqiCount) : 0,
      maxDepth,
      orphanedDevices: orphaned,
      coverageScore,
      lastScanTimestamp: Date.now()
    };
  }

  /**
   * Destroy and cleanup.
   */
  destroy() {
    this._destroyed = true;
    this.devices.clear();
    this.neighbors.clear();
    this._scanHistory = [];
    this.removeAllListeners();
  }
}

module.exports = NetworkTopologyCollector;
