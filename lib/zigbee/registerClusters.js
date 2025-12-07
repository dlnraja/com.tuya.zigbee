'use strict';

const { Cluster } = require('zigbee-clusters');

/**
 * Register all custom clusters with Homey
 * Call this ONCE at app startup in app.js
 *
 * IMPORTANT v5.5.44:
 * - Only register ONE cluster for 0xEF00 (TuyaSpecificCluster with NAME='tuya')
 * - Multiple clusters with same ID cause conflicts!
 * - Community pattern: zclNode.endpoints[1].clusters.tuya.on("response", ...)
 *
 * Reference: https://github.com/athombv/node-zigbee-clusters#implementing-a-custom-cluster
 *
 * @param {Object} logger - Homey logger instance (optional)
 */
function registerCustomClusters(logger = null) {
  try {
    // v5.5.44: Only load TuyaSpecificCluster (NAME='tuya')
    // DO NOT load TuyaManufacturerCluster - same ID causes conflict!
    let TuyaSpecificCluster;

    try {
      TuyaSpecificCluster = require('../clusters/TuyaSpecificCluster');
      if (logger) {
        logger.log('[OK] TuyaSpecificCluster module loaded (NAME=tuya, ID=0xEF00)');
      }
    } catch (loadErr) {
      if (logger) {
        logger.error('[ERROR] Cannot load TuyaSpecificCluster:', loadErr.message);
      }
    }

    // Register TuyaSpecificCluster (the only 0xEF00 cluster we need)
    if (TuyaSpecificCluster) {
      try {
        Cluster.addCluster(TuyaSpecificCluster);
        if (logger) {
          logger.log('[OK] ✅ TuyaSpecificCluster (0xEF00, NAME=tuya) registered');
          logger.log('[OK] 📋 Access via: zclNode.endpoints[1].clusters.tuya');
        }
      } catch (regErr) {
        if (regErr.message && regErr.message.includes('already exists')) {
          if (logger) {
            logger.log('[WARN] Tuya cluster already registered (skipping)');
          }
        } else {
          throw regErr;
        }
      }
    }

    return true;
  } catch (err) {
    if (logger) {
      logger.error('[ERROR] ❌ Failed to register custom clusters:', err.message);
      logger.error('[ERROR] Stack:', err.stack);
    }
    // Don't fail the app if cluster registration fails
    return false;
  }
}

module.exports = { registerCustomClusters };
