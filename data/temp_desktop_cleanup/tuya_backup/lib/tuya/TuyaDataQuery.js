'use strict';

/**
 * TuyaDataQuery - v5.5.27 Unified Tuya DP Query Module
 *
 * Provides a standardized way to query Tuya DP values from devices.
 *
 * Features:
 * - Generic tuyaDataQuery() for any device
 * - safeTuyaDataQuery() for sleepy devices (respects wake windows)
 * - Configurable delays between queries
 * - Multiple query methods (getData, dataQuery, mcuVersionRequest)
 *
 * Usage:
 *   const { TuyaDataQueryMixin } = require('../../lib/tuya/TuyaDataQuery');
 *   class MyDevice extends TuyaDataQueryMixin(HybridSensorBase) { ... }
 *
 * Or standalone:
 *   const { tuyaDataQuery } = require('../../lib/tuya/TuyaDataQuery');
 *   await tuyaDataQuery(device, [1, 2, 3], options);
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TUYA_CLUSTER_ID = 0xEF00; // 61184
const DEFAULT_DELAY_BETWEEN_QUERIES = 200; // ms
const DEFAULT_WAKE_WINDOW = 20000; // 20 seconds - time after last activity to consider device awake
const DEFAULT_ENDPOINT = 1;

// v5.5.70: LEARNING PERIOD - Always allow queries during first 5 minutes
// After learning, use observed behavior to decide
const LEARNING_PERIOD_MS = 5 * 60 * 1000; // 5 minutes

// ═══════════════════════════════════════════════════════════════════════════
// STANDALONE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Query Tuya DPs from a device
 *
 * @param {ZigBeeDevice} device - The Homey ZigBee device instance
 * @param {number|number[]} dpIds - Single DP ID or array of DP IDs to query
 * @param {Object} options - Configuration options
 * @param {number} options.endpointId - Endpoint ID (default: 1)
 * @param {number} options.delayBetweenQueries - Delay in ms between queries (default: 200)
 * @param {string} options.logPrefix - Log prefix (default: '[TUYA-QUERY]')
 * @param {boolean} options.silent - If true, suppress logs (default: false)
 * @returns {Promise<boolean>} - True if queries were sent successfully
 */
async function tuyaDataQuery(device, dpIds, options = {}) {
  const {
    endpointId = DEFAULT_ENDPOINT,
    delayBetweenQueries = DEFAULT_DELAY_BETWEEN_QUERIES,
    logPrefix = '[TUYA-QUERY]',
    silent = false,
  } = options;

  // Normalize dpIds to array
  if (!Array.isArray(dpIds)) dpIds = [dpIds];
  if (dpIds.length === 0) return true;

  const log = silent ? () => { } : (msg) => device.log?.(msg) || console.log(msg);
  const error = (msg, err) => device.error?.(msg, err) || console.error(msg, err);

  // Get endpoint
  const endpoint = device.zclNode?.endpoints?.[endpointId];
  if (!endpoint) {
    log(`${logPrefix} No endpoint ${endpointId} available`);
    return false;
  }

  // Find Tuya cluster
  const tuyaCluster = endpoint.clusters?.tuya
    || endpoint.clusters?.manuSpecificTuya
    || endpoint.clusters?.[TUYA_CLUSTER_ID]
    || endpoint.clusters?.[String(TUYA_CLUSTER_ID)]
    || endpoint.clusters?.['61184'];

  // Try TuyaEF00Manager if available
  const manager = device.tuyaEF00Manager;

  if (!tuyaCluster && !manager) {
    log(`${logPrefix} No Tuya cluster or manager available`);
    return false;
  }

  log(`${logPrefix} Querying ${dpIds.length} DPs: [${dpIds.join(', ')}]`);

  let successCount = 0;

  for (const dp of dpIds) {
    try {
      let sent = false;

      // Method 1: Use TuyaEF00Manager if available
      if (manager) {
        if (typeof manager.getData === 'function') {
          await manager.getData(dp).catch(() => { });
          sent = true;
        } else if (typeof manager.requestDP === 'function') {
          await manager.requestDP(dp).catch(() => { });
          sent = true;
        } else if (typeof manager.sendCommand === 'function') {
          await manager.sendCommand('dataQuery', { dp }).catch(() => { });
          sent = true;
        }
      }

      // Method 2: Direct cluster command
      if (!sent && tuyaCluster && typeof tuyaCluster.command === 'function') {
        // Try different command names
        const commands = ['getData', 'dataQuery', 'dataRequest'];
        for (const cmd of commands) {
          try {
            await tuyaCluster.command(cmd, { dp, dpId: dp }, { disableDefaultResponse: true });
            sent = true;
            break;
          } catch (e) {
            // Try next command
          }
        }
      }

      // Method 3: Raw frame if available
      if (!sent && manager && typeof manager.sendRaw === 'function') {
        // Tuya getData frame: seq(2) + dpId(1)
        const seq = Date.now() % 65535;
        await manager.sendRaw(0x04, Buffer.from([
          (seq >> 8) & 0xFF, seq & 0xFF, dp
        ])).catch(() => { });
        sent = true;
      }

      if (sent) {
        successCount++;
        if (!silent) log(`${logPrefix} DP${dp} query sent`);
      }

      // Delay between queries to avoid overwhelming the device
      if (delayBetweenQueries > 0 && dpIds.indexOf(dp) < dpIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenQueries));
      }
    } catch (err) {
      error(`${logPrefix} Failed to query DP${dp}:`, err.message);
    }
  }

  log(`${logPrefix} Completed: ${successCount}/${dpIds.length} queries sent`);
  return successCount > 0;
}

/**
 * Safe query for sleepy devices - only queries if device was recently active
 *
 * @param {ZigBeeDevice} device - The Homey ZigBee device instance
 * @param {number|number[]} dpIds - Single DP ID or array of DP IDs to query
 * @param {Object} options - Configuration options (same as tuyaDataQuery + wakeWindow)
 * @param {number} options.wakeWindow - Time in ms after last activity to consider device awake (default: 20000)
 * @returns {Promise<boolean>} - True if queries were sent, false if device is sleeping
 */
async function safeTuyaDataQuery(device, dpIds, options = {}) {
  const {
    wakeWindow = DEFAULT_WAKE_WINDOW,
    logPrefix = '[TUYA-SAFE-QUERY]',
    ...queryOptions
  } = options;

  const log = (msg) => device.log?.(msg) || console.log(msg);

  // v5.5.70: LEARNING PERIOD - Always allow queries during first 5 minutes
  // This lets the system discover the device's actual behavior (AC/DC/battery)
  const initTime = device._deviceInitTime;
  const now = Date.now();

  if (!initTime) {
    // First call ever - initialize and allow
    device._deviceInitTime = now;
    device._lastRadioActivity = now;
    log(`${logPrefix} First query - starting learning period (5 min)`);
    return tuyaDataQuery(device, dpIds, { ...queryOptions, logPrefix });
  }

  const timeSinceInit = now - initTime;
  const inLearningPeriod = timeSinceInit < LEARNING_PERIOD_MS;

  if (inLearningPeriod) {
    // During learning period, always allow queries to discover behavior
    const remaining = Math.round((LEARNING_PERIOD_MS - timeSinceInit) / 1000);
    log(`${logPrefix} Learning period active (${remaining}s left) → allowing query`);
    device._lastRadioActivity = now;
    return tuyaDataQuery(device, dpIds, { ...queryOptions, logPrefix });
  }

  // After learning period, check if device is sleepy
  const isSleepy = isSleepyEndDevice(device);

  if (isSleepy) {
    const lastActivity = device._lastRadioActivity || device._lastEventTime;

    // If no recent activity recorded, use learned behavior
    if (!lastActivity) {
      log(`${logPrefix} Device is sleepy, no recent activity → skipping query`);
      return false;
    }

    const elapsed = now - lastActivity;

    if (elapsed > wakeWindow) {
      log(`${logPrefix} Device is sleepy and was idle for ${Math.round(elapsed / 1000)}s → skipping query`);
      return false;
    }

    log(`${logPrefix} Device is sleepy but was active ${Math.round(elapsed / 1000)}s ago → proceeding`);
  }

  return tuyaDataQuery(device, dpIds, { ...queryOptions, logPrefix });
}

/**
 * Check if device is a sleepy end device (battery powered, not always listening)
 *
 * @param {ZigBeeDevice} device - The Homey ZigBee device instance
 * @returns {boolean} - True if device is sleepy
 */
function isSleepyEndDevice(device) {
  // Check various indicators
  const settings = device.getSettings?.() || {};
  const store = device.getStore?.() || {};

  // Explicit setting
  if (settings.zb_receive_when_idle === '⨯' || settings.zb_receive_when_idle === false) {
    return true;
  }
  if (store.zb_receive_when_idle === false) {
    return true;
  }

  // Check mainsPowered getter
  if (typeof device.mainsPowered !== 'undefined' && device.mainsPowered === false) {
    return true;
  }

  // Check node type if available
  const node = device.zclNode?.node || device.node;
  if (node?.type === 'EndDevice' || node?.type === 'end-device') {
    return true;
  }

  return false;
}

/**
 * Update last radio activity timestamp (call from DP/ZCL handlers)
 *
 * @param {ZigBeeDevice} device - The Homey ZigBee device instance
 */
function updateRadioActivity(device) {
  device._lastRadioActivity = Date.now();
}

// ═══════════════════════════════════════════════════════════════════════════
// MIXIN FOR DEVICE CLASSES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mixin that adds TuyaDataQuery methods to a device class
 *
 * Usage:
 *   class MyDevice extends TuyaDataQueryMixin(HybridSensorBase) {
 *     async refreshAll() {
 *       await this.tuyaDataQuery([1, 2, 3]);
 *     }
 *   }
 */
function TuyaDataQueryMixin(Base) {
  return class extends Base {
    /**
     * Query Tuya DPs
     * @param {number|number[]} dpIds - DP IDs to query
     * @param {Object} options - Query options
     */
    async tuyaDataQuery(dpIds, options = {}) {
      return tuyaDataQuery(this, dpIds, options);
    }

    /**
     * Safe query for sleepy devices
     * @param {number|number[]} dpIds - DP IDs to query
     * @param {Object} options - Query options
     */
    async safeTuyaDataQuery(dpIds, options = {}) {
      return safeTuyaDataQuery(this, dpIds, options);
    }

    /**
     * Check if this device is a sleepy end device
     * @returns {boolean}
     */
    isSleepyEndDevice() {
      return isSleepyEndDevice(this);
    }

    /**
     * Update last radio activity (call from handlers)
     */
    updateRadioActivity() {
      updateRadioActivity(this);
    }

    /**
     * Generic refresh handler for Flow Cards
     * Override refreshAll(), refreshEnergy(), or refreshBattery() in subclass
     */
    async onFlowCardRefresh() {
      this.log('[REFRESH] Flow card refresh triggered');

      if (typeof this.refreshAll === 'function') {
        return this.refreshAll();
      }
      if (typeof this.refreshEnergy === 'function') {
        return this.refreshEnergy();
      }
      if (typeof this.refreshBattery === 'function') {
        return this.refreshBattery();
      }

      this.log('[REFRESH] No refresh method implemented for this device');
      return false;
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DP PRESETS BY DEVICE TYPE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Common DP sets for different device types
 * Use these as reference when implementing refreshAll() methods
 */
const DP_PRESETS = {
  // Radar/mmWave presence sensors
  RADAR: {
    presence: [1],
    environment: [2, 3, 5, 6, 7], // temp, humidity, lux variations
    battery: [4, 15],
    config: [9, 10, 11, 101, 102, 103, 104, 105, 106],
    all: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 15, 101, 102, 103, 104, 105, 106],
  },

  // Climate sensors (temp/humidity)
  CLIMATE: {
    temperature: [1, 18],
    humidity: [2],
    battery: [4, 15],
    config: [9, 10, 11, 12, 13, 17, 19, 20],
    all: [1, 2, 4, 9, 10, 11, 12, 13, 15, 17, 18, 19, 20],
  },

  // Soil sensors
  SOIL: {
    moisture: [3, 101, 105],
    temperature: [1, 5],
    battery: [4, 14, 15],
    all: [1, 3, 4, 5, 14, 15, 101, 105],
  },

  // Buttons/SOS
  BUTTON: {
    press: [1],
    battery: [4, 15, 33, 35, 101],
    all: [1, 4, 15, 33, 35, 101],
  },

  // Smart plugs/switches with metering
  PLUG: {
    state: [1],
    power: [16, 17, 18, 19],
    energy: [17, 101, 102],
    all: [1, 16, 17, 18, 19, 101, 102],
  },

  // Generic battery DPs
  BATTERY: [4, 14, 15, 33, 35, 101],
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Standalone functions
  tuyaDataQuery,
  safeTuyaDataQuery,
  isSleepyEndDevice,
  updateRadioActivity,

  // Mixin for device classes
  TuyaDataQueryMixin,

  // DP presets
  DP_PRESETS,

  // Constants
  TUYA_CLUSTER_ID,
  DEFAULT_DELAY_BETWEEN_QUERIES,
  DEFAULT_WAKE_WINDOW,
};
