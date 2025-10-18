'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaManufacturerCluster = require('./TuyaManufacturerCluster');

/**
 * Register all custom clusters with Homey
 * Call this ONCE at app startup in app.js
 * 
 * Reference: https://github.com/athombv/node-zigbee-clusters#implementing-a-custom-cluster
 */
function registerCustomClusters() {
  try {
    Cluster.addCluster(TuyaManufacturerCluster);
    console.log('✅ Tuya Manufacturer Cluster (0xEF00) registered successfully');
    return true;
  } catch (err) {
    // Ignore if already registered
    if (err.message && err.message.includes('already exists')) {
      console.log('⚠️ Tuya Manufacturer Cluster already registered (skipping)');
      return true;
    }
    
    console.error('❌ Failed to register Tuya Manufacturer Cluster:', err);
    return false;
  }
}

module.exports = { registerCustomClusters };
