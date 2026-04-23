'use strict';

const { CLUSTERS } = require('../constants/ZigbeeConstants.js');
const { CLUSTER } = require('zigbee-clusters');
const IEEEAddressManager = require('../managers/IEEEAddressManager');

/**
 * ZigbeeHelpers - Utility functions for robust Zigbee device handling
 */
class ZigbeeHelpers {
  
  static get executionQueue() {
    if (!this._executionQueue) this._executionQueue = new Map();
    return this._executionQueue;
  }

  /**
   * Universal Command Queuing
   */
  static async executeQueuedCommand(device, commandFn) {
    const id = device.getData().id;
    if (!this.executionQueue.has(id)) {
      this.executionQueue.set(id, Promise.resolve());
    }

    const currentQueue = this.executionQueue.get(id);
    const nextTask = currentQueue.then(async () => {
      try {
        return await commandFn();
      } catch (err) {
        device.error(`[Q-CMD] Command failed for ${id}:`, err.message);
        throw err;
      }
    });

    this.executionQueue.set(id, nextTask.catch(() => {}));
    return nextTask;
  }
  
  static async getIeeeAddress(device) {
    const ieeeManager = new IEEEAddressManager(device);
    return ieeeManager.getDeviceIeeeAddress();
  }
  
  static async getCoordinatorIeeeAddress(device) {
    const ieeeManager = new IEEEAddressManager(device);
    return ieeeManager.getCoordinatorIeeeAddress();
  }
  
  static normalizeClusterSpec(clusterSpec) {
    if (typeof clusterSpec === 'number') return clusterSpec;
    if (clusterSpec && typeof clusterSpec === 'object' && clusterSpec.ID !== undefined) return clusterSpec;
    
    if (typeof clusterSpec === 'string') {
      const clusterMap = {
        'basic': 0, 'genBasic': 0,
        'powerConfiguration': 1, 'genPowerCfg': 1,
        'identify': 3, 'genIdentify': 3,
        'groups': 4, 'genGroups': 4,
        'scenes': 5, 'genScenes': 5,
        'onOff': 6, 'genOnOff': 6,
        'levelControl': 8, 'genLevelCtrl': 8,
        'alarms': 9, 'genAlarms': 9,
        'time': 10, 'genTime': 10,
        'ota': 25, 'genOta': 25,
        'temperatureMeasurement': 1026, 'msTemperatureMeasurement': 1026,
        'relativeHumidity': 1029, 'msRelativeHumidity': 1029,
        'occupancySensing': 1030, 'msOccupancySensing': 1030,
        'illuminanceMeasurement': 1024, 'msIlluminanceMeasurement': 1024,
        'iasZone': 1280, 'ssIasZone': 1280,
        'manuSpecificTuya': CLUSTERS.TUYA_EF00, 'tuya': CLUSTERS.TUYA_EF00,
      };
      
      const normalized = clusterSpec.toLowerCase();
      if (clusterMap[normalized] !== undefined) return clusterMap[normalized];
      
      if (normalized.startsWith('0x')) {
        const parsed = parseInt(normalized, 16);
        if (!isNaN(parsed)) return parsed;
      }
      
      const clusterKey = Object.keys(CLUSTER).find(key => 
        key.toLowerCase() === normalized || 
        CLUSTER[key]?.name?.toLowerCase() === normalized
      );
      if (clusterKey && CLUSTER[clusterKey]) return CLUSTER[clusterKey];
    }
    
    return clusterSpec;
  }
  
  static setupClusterListener(endpoint, clusterSpec, attribute, callback, device) {
    try {
      const normalizedCluster = this.normalizeClusterSpec(clusterSpec);
      let cluster = null;
      if (typeof normalizedCluster === 'number') {
        cluster = endpoint.clusters?.[normalizedCluster];
      } else if (normalizedCluster && normalizedCluster.ID !== undefined) {
        cluster = endpoint.clusters?.[normalizedCluster.ID];
      }
      
      if (!cluster && typeof clusterSpec === 'string') {
        cluster = endpoint.clusters?.[clusterSpec] || endpoint.clusters?.[clusterSpec.toLowerCase()];
      }
      
      if (!cluster) {
        device?.log('[WARN] Cluster not found:', clusterSpec);
        return false;
      }
      
      cluster.on(`attr.${attribute}`, callback);
      return true;
    } catch (err) {
      device?.error('Cluster listener setup failed:', err.message);
      return false;
    }
  }
  
  static getCluster(endpoint, clusterSpec) {
    if (!endpoint?.clusters) return null;
    const normalized = this.normalizeClusterSpec(clusterSpec);
    if (typeof normalized === 'number') return endpoint.clusters[normalized] || null;
    if (normalized && normalized.ID !== undefined) return endpoint.clusters[normalized.ID] || null;
    if (typeof clusterSpec === 'string') {
      return endpoint.clusters[clusterSpec] || endpoint.clusters[clusterSpec.toLowerCase()] || null;
    }
    return null;
  }
}

module.exports = ZigbeeHelpers;
