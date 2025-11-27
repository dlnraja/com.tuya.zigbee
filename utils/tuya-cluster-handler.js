'use strict';

/**
 * Tuya Cluster Handler - Stub for backward compatibility
 * Real Tuya cluster handling is in lib/tuya/TuyaEF00Manager.js
 */

const TuyaEF00Manager = require('../lib/tuya/TuyaEF00Manager');

/**
 * Handle Tuya cluster commands
 * @param {Object} device - Device instance
 * @param {Object} zclNode - ZCL node
 * @returns {Object} Handler instance
 */
function createTuyaClusterHandler(device, zclNode) {
  const manager = new TuyaEF00Manager(device);

  return {
    manager,

    async sendDP(dpId, value, dataType) {
      try {
        return await manager.sendDP(dpId, value, dataType);
      } catch (err) {
        device?.log?.('[TuyaClusterHandler] sendDP error:', err.message);
        return null;
      }
    },

    async requestDP(dpId) {
      try {
        return await manager.requestDP(device, dpId);
      } catch (err) {
        device?.log?.('[TuyaClusterHandler] requestDP error:', err.message);
        return null;
      }
    },

    onDPReport(callback) {
      // Register DP report listener
      manager.onDataPoint = callback;
    }
  };
}

module.exports = {
  createTuyaClusterHandler,
  TuyaClusterHandler: createTuyaClusterHandler
};
