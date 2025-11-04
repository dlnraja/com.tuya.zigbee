'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaManufacturerCluster = require('./tuya/TuyaManufacturerCluster');

/**
 * Register all custom clusters with Homey
 * Call this ONCE at app startup in app.js
 * 
 * Reference: https://github.com/athombv/node-zigbee-clusters#implementing-a-custom-cluster
 * 
 * @param {Object} logger - Homey logger instance (optional)
 */
function registerCustomClusters(logger = null) {
  try {
    Cluster.addCluster(TuyaManufacturerCluster);
    if (logger) {
      logger.log('[OK] Tuya Manufacturer Cluster (0xEF00) registered successfully');
    }
    return true;
  } catch (err) {
    // Ignore if already registered
    if (err.message && err.message.includes('already exists')) {
      if (logger) {
        logger.log('[WARN] Tuya Manufacturer Cluster already registered (skipping)');
      }
      return true;
    }
    
    if (logger) {
      logger.error('[ERROR] Failed to register Tuya Manufacturer Cluster:', err);
    }
    return false;
  }
}

module.exports = { registerCustomClusters };
