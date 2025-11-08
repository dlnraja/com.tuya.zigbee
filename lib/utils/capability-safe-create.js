'use strict';

/**
 * Safe Capability Creation - Prevents duplicate capability crash
 * 
 * Homey throws error if capability already exists:
 * "A Capability with ID homey:app:com.dlnraja.tuya.zigbee:fan_speed already exists"
 * 
 * This wrapper catches the error and continues gracefully.
 */

/**
 * Create capability safely (skip if already exists)
 * 
 * @param {Object} homey - Homey instance
 * @param {string} capabilityId - Capability ID
 * @param {Object} schema - Capability schema
 * @returns {Promise<boolean>} - Success status
 */
async function createCapabilitySafe(homey, capabilityId, schema) {
  try {
    // Attempt to create capability
    // Note: Exact API depends on Homey SDK version
    // This is a generic wrapper that handles the error
    
    console.log(`[CAP-SAFE] Attempting to create capability: ${capabilityId}`);
    
    // If using ManagerCapabilities (older SDK)
    if (homey.ManagerCapabilities && typeof homey.ManagerCapabilities.createCapability === 'function') {
      await homey.ManagerCapabilities.createCapability(capabilityId, schema);
    }
    // If using direct Capability class (newer SDK)
    else if (global.Capability && typeof global.Capability.create === 'function') {
      await global.Capability.create({ id: capabilityId, ...schema });
    }
    else {
      console.log(`[CAP-SAFE] No capability creation API available - skipping ${capabilityId}`);
      return false;
    }
    
    console.log(`[CAP-SAFE] ✅ Created ${capabilityId}`);
    return true;
    
  } catch (err) {
    // Check if error is "already exists" - this is OK
    if (err && /already exists|exists|duplicate/i.test(err.message)) {
      console.warn(`[CAP-SAFE] ⚠️  Capability ${capabilityId} already exists — skipping creation.`);
      return false; // Not an error, just skip
    }
    
    // If different error → throw it
    console.error(`[CAP-SAFE] ❌ Failed to create ${capabilityId}:`, err.message);
    throw err;
  }
}

/**
 * Add capability to device safely
 * Prevents crash if capability already exists on device
 * 
 * @param {Object} device - Device instance
 * @param {string} capability - Capability name
 * @returns {Promise<boolean>} - Success status
 */
async function addCapabilitySafe(device, capability) {
  try {
    // Check if capability already exists
    if (device.hasCapability(capability)) {
      device.log(`[CAP-SAFE] Capability ${capability} already exists - skipping`);
      return false;
    }
    
    // Add capability
    await device.addCapability(capability);
    device.log(`[CAP-SAFE] ✅ Added capability: ${capability}`);
    return true;
    
  } catch (err) {
    // Check if error is "already exists"
    if (err && /already exists|exists|duplicate/i.test(err.message)) {
      device.log(`[CAP-SAFE] ⚠️  Capability ${capability} already exists - skipping`);
      return false;
    }
    
    device.error(`[CAP-SAFE] ❌ Failed to add ${capability}:`, err.message);
    throw err;
  }
}

/**
 * Remove capability from device safely
 * Prevents crash if capability doesn't exist
 * 
 * @param {Object} device - Device instance
 * @param {string} capability - Capability name
 * @returns {Promise<boolean>} - Success status
 */
async function removeCapabilitySafe(device, capability) {
  try {
    // Check if capability exists
    if (!device.hasCapability(capability)) {
      device.log(`[CAP-SAFE] Capability ${capability} doesn't exist - skipping removal`);
      return false;
    }
    
    // Remove capability
    await device.removeCapability(capability);
    device.log(`[CAP-SAFE] ✅ Removed capability: ${capability}`);
    return true;
    
  } catch (err) {
    // Check if error is "doesn't exist"
    if (err && /not found|doesn't exist|does not exist/i.test(err.message)) {
      device.log(`[CAP-SAFE] ⚠️  Capability ${capability} doesn't exist - skipping removal`);
      return false;
    }
    
    device.error(`[CAP-SAFE] ❌ Failed to remove ${capability}:`, err.message);
    throw err;
  }
}

module.exports = {
  createCapabilitySafe,
  addCapabilitySafe,
  removeCapabilitySafe
};
