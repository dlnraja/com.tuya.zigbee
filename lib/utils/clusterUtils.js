'use strict';

/**
 * Safe Cluster Utilities
 * Prevents crashes from missing clusters or invalid cluster IDs.
 *
 * IMPORTANT: these are free functions — never use `this`. Gmail crash logs
 * showed TypeError reading `_destroyed` when timeouts closed over unbound this
 * (clusterUtils.js timeout callbacks).
 */

function _scheduleTimeout(fn, timeoutMs) {
  const ms = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 5000;
  try {
    if (typeof globalThis.setTimeout === 'function') {
      return globalThis.setTimeout(fn, ms);
    }
  } catch (_e) { /* ignore */ }
  // Last resort — should not throw
  return setTimeout(fn, ms);
}

/**
 * Safely read cluster attributes with timeout protection
 * @param {Object} cluster - Cluster object from endpoint.clusters.*
 * @param {Array<string>} attrs - Array of attribute names to read
 * @param {number} timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns {Promise<Object|null>} Attribute results or null if failed
 */
async function safeReadCluster(cluster, attrs = [], timeoutMs = 5000) {
  try {
    if (!cluster || typeof cluster.readAttributes !== 'function') {
      return null;
    }

    const timeoutPromise = new Promise((_, reject) => {
      _scheduleTimeout(() => reject(new Error('Timeout: Expected Response')), timeoutMs);
    });

    return await Promise.race([
      cluster.readAttributes(attrs),
      timeoutPromise,
    ]);
  } catch (_err) {
    return null;
  }
}

/**
 * Safely configure cluster reporting with timeout protection
 * @param {Object} cluster - Cluster object
 * @param {Object} config - Reporting configuration
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<boolean>} Success status
 */
async function safeConfigureReporting(cluster, config = {}, timeoutMs = 5000) {
  try {
    if (!cluster || typeof cluster.configureReporting !== 'function') {
      return false;
    }

    const timeoutPromise = new Promise((_, reject) => {
      _scheduleTimeout(() => reject(new Error('Timeout: Expected Response')), timeoutMs);
    });

    await Promise.race([
      cluster.configureReporting(config),
      timeoutPromise,
    ]);

    return true;
  } catch (_err) {
    return false;
  }
}

/**
 * Safely bind cluster with timeout protection
 * @param {Object} cluster - Cluster object
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<boolean>} Success status
 */
async function safeBindCluster(cluster, timeoutMs = 5000) {
  try {
    if (!cluster || typeof cluster.bind !== 'function') {
      return false;
    }

    const timeoutPromise = new Promise((_, reject) => {
      _scheduleTimeout(() => reject(new Error('Timeout: Expected Response')), timeoutMs);
    });

    await Promise.race([
      cluster.bind(),
      timeoutPromise,
    ]);

    return true;
  } catch (_err) {
    return false;
  }
}

/**
 * Check if cluster exists and is accessible
 * @param {Object} endpoint - Zigbee endpoint
 * @param {string} clusterName - Name of cluster to check
 * @returns {Object|null} Cluster object or null
 */
function getCluster(endpoint, clusterName) {
  try {
    if (!endpoint || !endpoint.clusters) {
      return null;
    }

    if (endpoint.clusters[clusterName]) {
      return endpoint.clusters[clusterName];
    }

    const lowerName = String(clusterName).toLowerCase();
    for (const [key, cluster] of Object.entries(endpoint.clusters)) {
      if (key.toLowerCase() === lowerName) {
        return cluster;
      }
    }

    return null;
  } catch (_err) {
    return null;
  }
}

module.exports = {
  safeReadCluster,
  safeConfigureReporting,
  safeBindCluster,
  getCluster,
};
