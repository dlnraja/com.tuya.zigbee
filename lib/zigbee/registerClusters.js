'use strict';

const { Cluster } = require('zigbee-clusters');

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
    // Try to load Tuya clusters with proper error handling
    let TuyaManufacturerCluster, TuyaSpecificCluster;
    
    try {
      TuyaManufacturerCluster = require('./tuya/TuyaManufacturerCluster');
      if (logger) {
        logger.log('[OK] TuyaManufacturerCluster module loaded');
      }
    } catch (loadErr) {
      if (logger) {
        logger.error('[ERROR] Cannot load TuyaManufacturerCluster:', loadErr.message);
      }
    }
    
    try {
      TuyaSpecificCluster = require('./tuya/TuyaSpecificCluster');
      if (logger) {
        logger.log('[OK] TuyaSpecificCluster module loaded');
      }
    } catch (loadErr) {
      if (logger) {
        logger.error('[ERROR] Cannot load TuyaSpecificCluster:', loadErr.message);
      }
    }
    
    // Register TuyaManufacturerCluster if loaded
    if (TuyaManufacturerCluster) {
      try {
        Cluster.addCluster(TuyaManufacturerCluster);
        if (logger) {
          logger.log('[OK] ✅ TuyaManufacturerCluster (0xEF00) registered successfully');
        }
      } catch (regErr) {
        if (regErr.message && regErr.message.includes('already exists')) {
          if (logger) {
            logger.log('[WARN] TuyaManufacturerCluster already registered (skipping)');
          }
        } else {
          throw regErr;
        }
      }
    }
    
    // Register TuyaSpecificCluster if loaded
    if (TuyaSpecificCluster) {
      try {
        Cluster.addCluster(TuyaSpecificCluster);
        if (logger) {
          logger.log('[OK] ✅ TuyaSpecificCluster (0xEF00) registered successfully');
        }
      } catch (regErr) {
        if (regErr.message && regErr.message.includes('already exists')) {
          if (logger) {
            logger.log('[WARN] TuyaSpecificCluster already registered (skipping)');
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
