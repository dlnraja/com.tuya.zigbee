'use strict';

/**
 * capability-safe.js - Safe capability creation with persistence
 * 
 * Prevents "Capability already exists" crashes by tracking created capabilities
 * in device store and checking before creation.
 * 
 * Usage:
 *   const { createCapabilitySafe } = require('./utils/capability-safe');
 *   await createCapabilitySafe(device, 'measure_battery');
 */

/**
 * Safely create a capability, preventing duplicates
 * @param {Device} device - Homey device instance
 * @param {string} capabilityId - Capability ID to create
 * @param {object} opts - Optional capability options
 * @returns {Promise<boolean>} - true if created, false if already exists or failed
 */
async function createCapabilitySafe(device, capabilityId, opts = {}) {
  try {
    if (!device || !capabilityId) {
      console.warn('[CAPABILITY-SAFE] Invalid parameters:', { device: !!device, capabilityId });
      return false;
    }

    // Check if capability already exists on device
    if (device.hasCapability && device.hasCapability(capabilityId)) {
      device.log && device.log(`[CAPABILITY-SAFE] ℹ️  Capability ${capabilityId} already exists`);
      return false;
    }

    // Get or initialize store
    let store;
    try {
      store = device.getStoreSync ? device.getStoreSync() : await device.getStore();
    } catch (err) {
      store = {};
    }
    
    store = store || {};
    store._createdCapabilities = store._createdCapabilities || {};

    // Check if we've already created this capability
    if (store._createdCapabilities[capabilityId]) {
      device.log && device.log(`[CAPABILITY-SAFE] ℹ️  Capability ${capabilityId} already tracked in store`);
      return false;
    }

    // Attempt to create capability
    if (device.addCapability && typeof device.addCapability === 'function') {
      try {
        await device.addCapability(capabilityId);
        device.log && device.log(`[CAPABILITY-SAFE] ✅ Created capability: ${capabilityId}`);
      } catch (err) {
        // Check if error is "already exists"
        if (err.message && err.message.includes('already exists')) {
          device.log && device.log(`[CAPABILITY-SAFE] ℹ️  Capability ${capabilityId} already exists (caught)`);
          // Mark as created anyway
          store._createdCapabilities[capabilityId] = true;
          if (device.setStore) await device.setStore(store);
          return false;
        }
        throw err;
      }
    } else {
      device.error && device.error('[CAPABILITY-SAFE] ❌ Device does not support addCapability');
      return false;
    }

    // Mark as created in store
    store._createdCapabilities[capabilityId] = true;
    if (device.setStore) {
      await device.setStore(store);
    }

    return true;

  } catch (err) {
    // Log but don't crash
    device.error && device.error(`[CAPABILITY-SAFE] ❌ Failed to create ${capabilityId}:`, err.message);
    return false;
  }
}

/**
 * Safely remove a capability
 * @param {Device} device - Homey device instance
 * @param {string} capabilityId - Capability ID to remove
 * @returns {Promise<boolean>} - true if removed, false if doesn't exist or failed
 */
async function removeCapabilitySafe(device, capabilityId) {
  try {
    if (!device || !capabilityId) {
      console.warn('[CAPABILITY-SAFE] Invalid parameters for remove');
      return false;
    }

    // Check if capability exists
    if (!device.hasCapability || !device.hasCapability(capabilityId)) {
      device.log && device.log(`[CAPABILITY-SAFE] ℹ️  Capability ${capabilityId} does not exist`);
      return false;
    }

    // Attempt to remove
    if (device.removeCapability && typeof device.removeCapability === 'function') {
      await device.removeCapability(capabilityId);
      device.log && device.log(`[CAPABILITY-SAFE] ✅ Removed capability: ${capabilityId}`);
    } else {
      device.error && device.error('[CAPABILITY-SAFE] ❌ Device does not support removeCapability');
      return false;
    }

    // Update store
    let store;
    try {
      store = device.getStoreSync ? device.getStoreSync() : await device.getStore();
    } catch (err) {
      store = {};
    }
    
    store = store || {};
    store._createdCapabilities = store._createdCapabilities || {};
    delete store._createdCapabilities[capabilityId];
    
    if (device.setStore) {
      await device.setStore(store);
    }

    return true;

  } catch (err) {
    device.error && device.error(`[CAPABILITY-SAFE] ❌ Failed to remove ${capabilityId}:`, err.message);
    return false;
  }
}

/**
 * Reset capability tracking (useful for debugging)
 * @param {Device} device - Homey device instance
 */
async function resetCapabilityTracking(device) {
  try {
    let store;
    try {
      store = device.getStoreSync ? device.getStoreSync() : await device.getStore();
    } catch (err) {
      store = {};
    }
    
    store = store || {};
    store._createdCapabilities = {};
    
    if (device.setStore) {
      await device.setStore(store);
    }
    
    device.log && device.log('[CAPABILITY-SAFE] ✅ Reset capability tracking');
    return true;
  } catch (err) {
    device.error && device.error('[CAPABILITY-SAFE] ❌ Failed to reset tracking:', err.message);
    return false;
  }
}

/**
 * Get list of tracked capabilities
 * @param {Device} device - Homey device instance
 * @returns {Promise<string[]>} - List of tracked capability IDs
 */
async function getTrackedCapabilities(device) {
  try {
    let store;
    try {
      store = device.getStoreSync ? device.getStoreSync() : await device.getStore();
    } catch (err) {
      store = {};
    }
    
    store = store || {};
    const tracked = store._createdCapabilities || {};
    return Object.keys(tracked);
  } catch (err) {
    device.error && device.error('[CAPABILITY-SAFE] ❌ Failed to get tracked capabilities:', err.message);
    return [];
  }
}

module.exports = {
  createCapabilitySafe,
  removeCapabilitySafe,
  resetCapabilityTracking,
  getTrackedCapabilities
};
