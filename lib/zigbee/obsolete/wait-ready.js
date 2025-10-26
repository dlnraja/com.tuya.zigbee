'use strict';

/**
 * Wait for Zigbee to be ready before attempting operations
 * Prevents "Zigbee est en cours de démarrage" errors
 * 
 * @param {Object} device - Homey ZigBee device instance
 * @param {Object} options - Configuration options
 * @param {number} options.maxAttempts - Maximum number of retry attempts (default: 15)
 * @param {number} options.delayMs - Delay between attempts in milliseconds (default: 300)
 * @returns {Promise<Object|null>} - Returns endpoint or null if timeout
 */
async function waitForZigbeeReady(device, { maxAttempts = 15, delayMs = 300 } = {}) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      // Check if Zigbee node and endpoint are accessible
      const endpoint = device?.zclNode?.endpoints?.[1];
      
      if (endpoint && endpoint.clusters) {
        // Successfully accessed endpoint
        device.log(`[OK] Zigbee ready (attempt ${i + 1}/${maxAttempts})`);
        return endpoint;
      }
      
      // Not ready yet, wait before retry
      await new Promise(resolve => setTimeout(resolve, delayMs)).catch(err => this.error(err));
      
    } catch (err) {
      // Ignore errors during readiness check
      if (i === maxAttempts - 1) {
        device.error('Zigbee readiness check failed:', err.message);
      }
    }
  }
  
  device.error(`[ERROR] Zigbee not ready after ${maxAttempts} attempts (${maxAttempts * delayMs}ms)`);
  return null;
}

/**
 * Wait for specific cluster to be ready
 * @param {Object} device - Homey ZigBee device instance
 * @param {string} clusterName - Name of cluster to wait for (e.g., 'iasZone', 'genPowerCfg')
 * @param {Object} options - Configuration options
 * @returns {Promise<Object|null>} - Returns cluster or null if timeout
 */
async function waitForCluster(device, clusterName, { maxAttempts = 15, delayMs = 300 } = {}) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const endpoint = device?.zclNode?.endpoints?.[1];
      const cluster = endpoint?.clusters?.[clusterName];
      
      if (cluster) {
        device.log(`[OK] Cluster ${clusterName} ready (attempt ${i + 1}/${maxAttempts})`);
        return cluster;
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs)).catch(err => this.error(err));
      
    } catch (err) {
      if (i === maxAttempts - 1) {
        device.error(`Cluster ${clusterName} readiness check failed:`, err.message);
      }
    }
  }
  
  device.error(`[ERROR] Cluster ${clusterName} not ready after ${maxAttempts} attempts`);
  return null;
}

module.exports = {
  waitForZigbeeReady,
  waitForCluster
};
