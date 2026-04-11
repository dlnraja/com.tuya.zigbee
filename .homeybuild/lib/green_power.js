'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║              GREEN POWER & UTILITY ENDPOINTS MODULE v1.0                     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Centralizes handling of Green Power and utility endpoints to:              ║
 * ║  - Avoid bind/configureReporting/readAttributes on EP 242 (Green Power)     ║
 * ║  - Avoid operations on EP 0 (ZDO/management)                                ║
 * ║  - Filter out Green Power Proxy device IDs (0x0061, 0x0062)                 ║
 * ║                                                                              ║
 * ║  Usage in drivers/UDH:                                                       ║
 * ║    const greenPower = require('../lib/green_power');                        ║
 * ║    const usable = greenPower.getUsableEndpoints(zclNode);                   ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const GREEN_POWER_ENDPOINT = 242;
const ZDO_ENDPOINT = 0;

// Green Power Proxy device IDs (from Zigbee spec)
const GP_PROXY_DEVICE_IDS = [
  0x0061,  // Green Power Proxy
  0x0062,  // Green Power Proxy Basic
  0x0064,  // Green Power Target Plus
  0x0065,  // Green Power Target
  0x0066,  // Green Power Commissioning Tool
  0x0067,  // Green Power Combo
  0x0068,  // Green Power Combo Basic
];

// Green Power profile ID
const GP_PROFILE_ID = 0xA1E0;  // 41440 decimal

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize endpoint ID to number
 * @param {string|number} endpointId - Endpoint ID
 * @returns {number} Normalized endpoint ID
 */
function normalizeEndpointId(endpointId) {
  if (typeof endpointId === 'number') return endpointId;
  if (typeof endpointId === 'string') return parseInt(endpointId, 10);
  return NaN;
}

/**
 * Check if endpoint is Green Power (242)
 * @param {string|number} endpointId - Endpoint ID
 * @returns {boolean}
 */
function isGreenPowerEndpoint(endpointId) {
  const id = normalizeEndpointId(endpointId);
  return id === GREEN_POWER_ENDPOINT;
}

/**
 * Check if endpoint is ZDO/management (0)
 * @param {string|number} endpointId - Endpoint ID
 * @returns {boolean}
 */
function isZdoEndpoint(endpointId) {
  const id = normalizeEndpointId(endpointId);
  return id === ZDO_ENDPOINT;
}

/**
 * Check if endpoint is a utility endpoint (should be ignored for business logic)
 * @param {string|number} endpointId - Endpoint ID
 * @param {object} endpointObj - Endpoint object with optional deviceId/profileId
 * @returns {boolean}
 */
function isUtilityEndpoint(endpointId, endpointObj = {}) {
  const id = normalizeEndpointId(endpointId);

  // Always skip ZDO and Green Power endpoints
  if (isZdoEndpoint(id) || isGreenPowerEndpoint(id)) {
    return true;
  }

  // Check for Green Power profile ID
  const profileId = endpointObj.profileId || endpointObj.profId;
  if (profileId === GP_PROFILE_ID) {
    return true;
  }

  // Check for Green Power Proxy device IDs
  const deviceId = endpointObj.deviceId || endpointObj.devId;
  if (GP_PROXY_DEVICE_IDS.includes(deviceId)) {
    return true;
  }

  return false;
}

/**
 * Get only usable endpoints (excluding Green Power, ZDO, and GP proxies)
 * @param {object} zclNode - ZCL node from Homey
 * @returns {Array<{id: number, endpoint: object}>} Array of usable endpoints
 */
function getUsableEndpoints(zclNode) {
  if (!zclNode || !zclNode.endpoints) {
    return [];
  }

  const endpoints = zclNode.endpoints;

  return Object.entries(endpoints)
    .filter(([id, ep]) => !isUtilityEndpoint(id, ep))
    .map(([id, ep]) => ({
      id: normalizeEndpointId(id),
      endpoint: ep,
    }))
    .sort((a, b) => a.id - b.id); // Sort by endpoint ID for consistency
}

/**
 * Get Green Power endpoints (for logging/diagnostics)
 * @param {object} zclNode - ZCL node from Homey
 * @returns {Array<number>} Array of Green Power endpoint IDs
 */
function getGreenPowerEndpoints(zclNode) {
  if (!zclNode || !zclNode.endpoints) {
    return [];
  }

  return Object.keys(zclNode.endpoints)
    .map(normalizeEndpointId)
    .filter(isGreenPowerEndpoint);
}

/**
 * Log endpoint analysis for diagnostics
 * @param {object} zclNode - ZCL node from Homey
 * @param {function} logFn - Logging function (e.g., this.log)
 */
function logEndpointAnalysis(zclNode, logFn = console.log) {
  if (!zclNode || !zclNode.endpoints) {
    logFn('[GREEN-POWER] No endpoints found');
    return;
  }

  const allIds = Object.keys(zclNode.endpoints).map(normalizeEndpointId);
  const usable = getUsableEndpoints(zclNode).map(e => e.id);
  const greenPower = getGreenPowerEndpoints(zclNode);
  const utility = allIds.filter(id => isUtilityEndpoint(id, zclNode.endpoints[id]));

  logFn('[GREEN-POWER] ═══════════════════════════════════════');
  logFn(`[GREEN-POWER] All endpoints: [${allIds.join(', ')}]`);
  logFn(`[GREEN-POWER] Usable endpoints: [${usable.join(', ')}]`);
  logFn(`[GREEN-POWER] Utility/GP endpoints: [${utility.join(', ')}]`);
  if (greenPower.length > 0) {
    logFn('[GREEN-POWER] Device has Green Power proxy (EP 242)');
  }
  logFn('[GREEN-POWER] ═══════════════════════════════════════');
}

/**
 * Safe cluster getter - returns null for utility endpoints
 * @param {object} zclNode - ZCL node from Homey
 * @param {string|number} endpointId - Endpoint ID
 * @param {string} clusterName - Cluster name
 * @returns {object|null} Cluster object or null
 */
function safeGetCluster(zclNode, endpointId, clusterName) {
  if (!zclNode || !zclNode.endpoints) return null;

  const endpoint = zclNode.endpoints[endpointId];
  if (!endpoint) return null;

  if (isUtilityEndpoint(endpointId, endpoint)) {
    return null;
  }

  return endpoint.clusters?.[clusterName] || null;
}

/**
 * Safe cluster operation - skips utility endpoints
 * @param {object} zclNode - ZCL node from Homey
 * @param {string|number} endpointId - Endpoint ID
 * @param {string} clusterName - Cluster name
 * @param {string} operation - Operation name (method on cluster)
 * @param {...any} args - Arguments for the operation
 * @returns {Promise<any>} Result of operation or undefined
 */
async function safeClusterOperation(zclNode, endpointId, clusterName, operation, ...args) {
  const cluster = safeGetCluster(zclNode, endpointId, clusterName);
  if (!cluster) return undefined;

  if (typeof cluster[operation] === 'function') {
    return cluster[operation](...args);
  }

  return undefined;
}

/**
 * Iterate over usable endpoints and execute callback
 * @param {object} zclNode - ZCL node from Homey
 * @param {function} callback - Callback(id, endpoint) to execute for each usable endpoint
 */
async function forEachUsableEndpoint(zclNode, callback) {
  const usable = getUsableEndpoints(zclNode);

  for (const { id, endpoint } of usable) {
    try {
      await callback(id, endpoint);
    } catch (err) {
      // Continue with other endpoints even if one fails
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Constants
  GREEN_POWER_ENDPOINT,
  ZDO_ENDPOINT,
  GP_PROFILE_ID,
  GP_PROXY_DEVICE_IDS,

  // Check functions
  normalizeEndpointId,
  isGreenPowerEndpoint,
  isZdoEndpoint,
  isUtilityEndpoint,

  // Endpoint getters
  getUsableEndpoints,
  getGreenPowerEndpoints,

  // Safe operations
  safeGetCluster,
  safeClusterOperation,
  forEachUsableEndpoint,

  // Diagnostics
  logEndpointAnalysis,
};
