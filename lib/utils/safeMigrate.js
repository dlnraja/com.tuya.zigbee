'use strict';

/**
 * safeMigrate.js - Safe device driver migration wrapper
 * 
 * Prevents crashes during driver migration by validating target driver
 * and catching errors gracefully.
 * 
 * Usage:
 *   const { safeMigrateDevice } = require('./utils/safeMigrate');
 *   const success = await safeMigrateDevice(device, 'switch_2_gang');
 */

const { queueMigration } = require('./migration-queue');

/**
 * Safely migrate device to a different driver
 * @param {Device} device - Homey device instance
 * @param {string} targetDriverId - Target driver ID
 * @param {string} reason - Reason for migration (for logging)
 * @returns {Promise<boolean>} - true if migrated/queued, false if failed
 */
async function safeMigrateDevice(device, targetDriverId, reason = 'auto') {
  try {
    if (!device) {
      console.error('[SAFE-MIGRATE] ❌ Invalid device instance');
      return false;
    }

    if (!targetDriverId || typeof targetDriverId !== 'string') {
      device.error && device.error('[SAFE-MIGRATE] ❌ Invalid targetDriverId:', targetDriverId);
      return false;
    }

    // Get current driver for comparison
    const currentDriverId = device.driver?.id || 'unknown';
    
    if (currentDriverId === targetDriverId) {
      device.log && device.log(`[SAFE-MIGRATE] ℹ️  Already on driver: ${targetDriverId}`);
      return false;
    }

    device.log && device.log('[SAFE-MIGRATE] 🔄 Attempting migration:');
    device.log && device.log(`   From: ${currentDriverId}`);
    device.log && device.log(`   To: ${targetDriverId}`);
    device.log && device.log(`   Reason: ${reason}`);

    // Validate target driver exists
    let targetDriver;
    try {
      if (device.homey && device.homey.drivers) {
        targetDriver = device.homey.drivers.getDriver(targetDriverId);
      }
    } catch (err) {
      device.error && device.error(`[SAFE-MIGRATE] ❌ Target driver not found: ${targetDriverId}`);
      device.error && device.error(`   Error: ${err.message}`);
      return false;
    }

    if (!targetDriver) {
      device.error && device.error(`[SAFE-MIGRATE] ❌ Target driver not found: ${targetDriverId}`);
      device.error && device.error('   This is an INVALID DRIVER ID - cannot migrate');
      device.error && device.error(`   Current driver will be preserved: ${currentDriverId}`);
      return false;
    }

    device.log && device.log(`[SAFE-MIGRATE] ✅ Target driver exists: ${targetDriver.id}`);

    // SDK3: Direct migration not available, use queue system
    if (device.homey && queueMigration) {
      const deviceId = device.getData().id;
      
      device.log && device.log('[SAFE-MIGRATE] 📋 Queueing migration (SDK3 mode)');
      device.log && device.log(`   Device ID: ${deviceId}`);
      device.log && device.log(`   Target: ${targetDriverId}`);
      
      await queueMigration(device.homey, deviceId, targetDriverId, reason);
      
      device.log && device.log('[SAFE-MIGRATE] ✅ Migration queued successfully');
      device.log && device.log('   ℹ️  User must manually switch driver in Homey app');
      device.log && device.log(`   ℹ️  Go to: Device → Advanced → Driver → Select "${targetDriverId}"`);
      
      return true;
    }

    // Fallback: log recommendation
    device.log && device.log('[SAFE-MIGRATE] ℹ️  Automatic migration not available');
    device.log && device.log(`   Recommendation: User should manually switch to ${targetDriverId}`);
    
    return false;

  } catch (err) {
    device.error && device.error('[SAFE-MIGRATE] ❌ Migration failed:', err.message);
    device.error && device.error('   Stack:', err.stack);
    return false;
  }
}

/**
 * Check if migration is safe (validates both drivers exist)
 * @param {Device} device - Homey device instance
 * @param {string} targetDriverId - Target driver ID
 * @returns {Promise<object>} - { safe: boolean, reason: string }
 */
async function checkMigrationSafety(device, targetDriverId) {
  try {
    if (!device || !targetDriverId) {
      return { safe: false, reason: 'Invalid parameters' };
    }

    const currentDriverId = device.driver?.id || 'unknown';

    // Same driver
    if (currentDriverId === targetDriverId) {
      return { safe: false, reason: 'Already on target driver' };
    }

    // Check target driver exists
    let targetDriver;
    try {
      if (device.homey && device.homey.drivers) {
        targetDriver = device.homey.drivers.getDriver(targetDriverId);
      }
    } catch (err) {
      return { safe: false, reason: `Target driver not found: ${targetDriverId}` };
    }

    if (!targetDriver) {
      return { safe: false, reason: `Target driver does not exist: ${targetDriverId}` };
    }

    // Check capabilities compatibility (optional)
    const currentCaps = device.getCapabilities() || [];
    const targetCaps = targetDriver.getCapabilities ? targetDriver.getCapabilities() : [];

    // If target has fewer capabilities, warn
    if (targetCaps.length > 0 && targetCaps.length < currentCaps.length) {
      return { 
        safe: true, 
        reason: `Warning: Target driver has fewer capabilities (${targetCaps.length} vs ${currentCaps.length})`,
        warning: true
      };
    }

    return { safe: true, reason: 'Migration appears safe' };

  } catch (err) {
    return { safe: false, reason: `Safety check failed: ${err.message}` };
  }
}

/**
 * Get recommended driver for device (uses database)
 * @param {Device} device - Homey device instance
 * @returns {Promise<string|null>} - Recommended driver ID or null
 */
async function getRecommendedDriver(device) {
  try {
    // Try to get from centralized database
    const { getRecommendedDriver: dbGetRecommendedDriver } = require('./DriverMappingLoader');
    
    const deviceData = device.getData();
    const model = deviceData.productId || device.getSetting('zb_product_id');
    const manufacturer = deviceData.manufacturerId || device.getSetting('zb_manufacturer_name');

    if (model && manufacturer) {
      const recommended = dbGetRecommendedDriver(model, manufacturer);
      if (recommended) {
        device.log && device.log(`[SAFE-MIGRATE] 📋 Database recommends: ${recommended}`);
        return recommended;
      }
    }

    device.log && device.log('[SAFE-MIGRATE] ℹ️  No database recommendation available');
    return null;

  } catch (err) {
    device.error && device.error('[SAFE-MIGRATE] ❌ Failed to get recommendation:', err.message);
    return null;
  }
}

module.exports = {
  safeMigrateDevice,
  checkMigrationSafety,
  getRecommendedDriver
};
