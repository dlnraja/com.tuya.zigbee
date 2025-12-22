'use strict';

/**
 * TuyaEF00Base - Central Helper for Tuya EF00 Manager Initialization
 *
 * PHASE 1 - Safe EF00 Manager Access
 * Provides safe initialization and access to the global TuyaEF00Manager
 * to prevent "tuyaEF00Manager not initialized" crashes.
 *
 * v5.0.3 - Hotfix based on diagnostic report d97f4921-e434-49ec-a64e-1e77dd68cdb0
 */

/**
 * Initialize Tuya DP Engine safely for any device
 *
 * @param {Object} device - The ZigBee device instance
 * @param {Object} zclNode - The ZCL node instance
 * @returns {Promise<Object|null>} - The EF00 manager or null if unavailable
 */
async function initTuyaDpEngineSafe(device, zclNode) {
  try {
    device.log('[TUYA-EF00] 🔧 Initializing Tuya DP Engine safely...');

    // Sanity checks
    if (!device) {
      console.error('[TUYA-EF00] ❌ Device instance is null/undefined');
      return null;
    }

    let manager = null;

    // v5.2.11: PRIORITY 1 - Use device's own manager (created by BaseHybridDevice)
    // This is the correct approach - each device has its own TuyaEF00Manager instance
    if (device.tuyaEF00Manager) {
      manager = device.tuyaEF00Manager;
      device.log('[TUYA-EF00] ✅ Using device.tuyaEF00Manager (created by BaseHybridDevice)');
    }
    // Fallback: Try app-level managers (legacy support)
    else if (device.homey?.app) {
      const app = device.homey.app;

      if (typeof app.getTuyaEF00Manager === 'function') {
        manager = app.getTuyaEF00Manager();
        device.log('[TUYA-EF00] ✅ Manager found via getTuyaEF00Manager()');
      } else if (app.tuyaEF00Manager) {
        manager = app.tuyaEF00Manager;
        device.log('[TUYA-EF00] ✅ Manager found via app.tuyaEF00Manager');
      }
    }

    // If no manager available, disable DP engine gracefully
    if (!manager) {
      device.log('[TUYA-EF00] ⚠️ EF00 manager not available');
      device.log('[TUYA-EF00] ℹ️ This may be because BaseHybridDevice.onNodeInit() hasn\'t completed yet');
      device.log('[TUYA-EF00] ℹ️ Device will use standard Zigbee clusters if available');

      // Store the disabled state
      if (typeof device.setStoreValue === 'function') {
        await device.setStoreValue('tuya_dp_engine_disabled', true).catch(() => { });
      }

      return null;
    }

    // Store the enabled state
    if (typeof device.setStoreValue === 'function') {
      await device.setStoreValue('tuya_dp_engine_disabled', false).catch(() => { });
    }

    // Verify manager has required methods
    const hasOn = typeof manager.on === 'function';
    const hasEmit = typeof manager.emit === 'function';

    if (!hasOn || !hasEmit) {
      device.log('[TUYA-EF00] ⚠️ Manager missing required methods (on/emit)');
      device.log('[TUYA-EF00] ℹ️ Manager type:', manager.constructor?.name || 'unknown');
      return null;
    }

    device.log('[TUYA-EF00] ✅ Manager verified and ready');
    return manager;

  } catch (err) {
    device.error('[TUYA-EF00] ❌ Exception during EF00 manager initialization:', err);
    return null;
  }
}

/**
 * Check if device has a valid EF00 manager
 *
 * @param {Object} device - The ZigBee device instance
 * @returns {boolean} - True if manager is available and valid
 */
function hasValidEF00Manager(device) {
  if (!device || !device.tuyaEF00Manager) {
    return false;
  }

  const manager = device.tuyaEF00Manager;
  const hasOn = typeof manager.on === 'function';
  const hasEmit = typeof manager.emit === 'function';

  return hasOn && hasEmit;
}

/**
 * Get the EF00 manager status for a device
 *
 * @param {Object} device - The ZigBee device instance
 * @returns {Object} - Status information
 */
function getEF00ManagerStatus(device) {
  const status = {
    available: false,
    source: 'none',
    hasOnMethod: false,
    hasEmitMethod: false,
    disabled: false,
  };

  if (!device) {
    return status;
  }

  // Check if DP engine is disabled
  if (typeof device.getStoreValue === 'function') {
    try {
      status.disabled = device.getStoreValue('tuya_dp_engine_disabled') === true;
    } catch (e) {
      // Ignore errors
    }
  }

  // Check manager availability
  if (device.tuyaEF00Manager) {
    status.available = true;
    status.source = 'device';
    status.hasOnMethod = typeof device.tuyaEF00Manager.on === 'function';
    status.hasEmitMethod = typeof device.tuyaEF00Manager.emit === 'function';
  } else if (device.homey?.app?.tuyaEF00Manager) {
    status.available = true;
    status.source = 'app';
    const manager = device.homey.app.tuyaEF00Manager;
    status.hasOnMethod = typeof manager.on === 'function';
    status.hasEmitMethod = typeof manager.emit === 'function';
  } else if (device.homey?.app?.getTuyaEF00Manager) {
    try {
      const manager = device.homey.app.getTuyaEF00Manager();
      if (manager) {
        status.available = true;
        status.source = 'getter';
        status.hasOnMethod = typeof manager.on === 'function';
        status.hasEmitMethod = typeof manager.emit === 'function';
      }
    } catch (e) {
      // Ignore errors
    }
  }

  return status;
}

/**
 * Log EF00 manager status for debugging
 *
 * @param {Object} device - The ZigBee device instance
 */
function logEF00Status(device) {
  const status = getEF00ManagerStatus(device);

  device.log('[TUYA-EF00] 📊 Manager Status:');
  device.log('[TUYA-EF00]   Available:', status.available);
  device.log('[TUYA-EF00]   Source:', status.source);
  device.log('[TUYA-EF00]   Has on():', status.hasOnMethod);
  device.log('[TUYA-EF00]   Has emit():', status.hasEmitMethod);
  device.log('[TUYA-EF00]   Disabled:', status.disabled);
}

module.exports = {
  initTuyaDpEngineSafe,
  hasValidEF00Manager,
  getEF00ManagerStatus,
  logEF00Status,
};
