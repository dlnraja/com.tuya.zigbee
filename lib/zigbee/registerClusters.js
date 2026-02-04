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

    // v5.8.15: Register TuyaE000Cluster (0xE000/57344) for MOES buttons
    // CRITICAL: Without this, SDK discards frames from cluster 57344
    // Fixes: _TZ3000_zgyzgdua physical buttons not triggering flows
    let TuyaE000Cluster;
    try {
      TuyaE000Cluster = require('../clusters/TuyaE000Cluster');
      if (logger) {
        logger.log('[OK] TuyaE000Cluster module loaded (NAME=tuyaE000, ID=0xE000)');
      }
    } catch (loadErr) {
      if (logger) {
        logger.error('[ERROR] Cannot load TuyaE000Cluster:', loadErr.message);
      }
    }

    if (TuyaE000Cluster) {
      try {
        Cluster.addCluster(TuyaE000Cluster);
        if (logger) {
          logger.log('[OK] ✅ TuyaE000Cluster (0xE000, NAME=tuyaE000) registered');
          logger.log('[OK] 📋 Access via: zclNode.endpoints[1].clusters.tuyaE000');
        }
      } catch (regErr) {
        if (regErr.message && regErr.message.includes('already exists')) {
          if (logger) {
            logger.log('[WARN] TuyaE000 cluster already registered (skipping)');
          }
        } else {
          if (logger) {
            logger.error('[WARN] TuyaE000Cluster registration error:', regErr.message);
          }
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
