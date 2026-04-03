'use strict';

/**
 * Safe Auto-Migration System
 *
 * Validates migration before execution:
 * - Confidence must be high (>90%)
 * - Target driver must exist
 * - User preference must not be set
 * - Tuya DP devices protected (never auto-migrate)
 * - Invalid driver IDs rejected
 *
 * Instead of crashing with device.setDriver(), queues migration safely.
 */

const { queueMigration } = require('./migration-queue');
const { getUserPreferredDriver } = require('./driver-preference');
const { isTuyaDP } = require('../helpers/device_helpers');

/**
 * Safe auto-migration with full validation
 *
 * @param {Object} device - Device instance
 * @param {string} recommendedDriverId - Recommended driver ID
 * @param {number} confidence - Confidence level (0-100)
 * @param {string} reason - Reason for migration
 * @returns {Promise<boolean>} - Success status
 */
async function safeAutoMigrate(device, recommendedDriverId, confidence = 0, reason = '') {
  const currentDriverId = device.driver.id;

  device.log('[SAFE-MIGRATE] Evaluating auto-migration...');
  device.log(`  Current: ${currentDriverId}`);
  device.log(`  Recommended: ${recommendedDriverId}`);
  device.log(`  Confidence: ${confidence}%`);
  device.log(`  Reason: ${reason}`);

  // RULE 1: Confidence must be high
  if (confidence < 90) {
    device.log(`[SAFE-MIGRATE] ⏭️  Confidence too low (${confidence}% < 90%)`);
    device.log('  Skipping auto-migration - manual review recommended');
    return false;
  }

  // RULE 2: Target driver must exist
  let targetDriver;
  try {
    targetDriver = device.homey.drivers.getDriver(recommendedDriverId);
  } catch (err) {
    targetDriver = null;
  }

  if (!targetDriver) {
    device.error(`[SAFE-MIGRATE] ❌ Target driver not found: ${recommendedDriverId}`);
    device.error('  This is an INVALID DRIVER ID - cannot migrate');
    device.error(`  Current driver will be preserved: ${currentDriverId}`);
    return false;
  }

  device.log(`[SAFE-MIGRATE] ✅ Target driver exists: ${recommendedDriverId}`);

  // RULE 3: Check user preference
  const userPref = await getUserPreferredDriver(device);

  if (userPref && userPref.driverId === currentDriverId) {
    device.log('[SAFE-MIGRATE] 🔒 User preference set for current driver');
    device.log(`  User explicitly selected: ${currentDriverId}`);
    device.log('  AUTO-MIGRATION BLOCKED - respecting user choice');
    return false;
  }

  // RULE 4: Protect Tuya DP devices (TS0601, cluster 0xEF00)
  const data = device.getData() || {};
  const deviceInfo = {
    modelId: data.modelId || data.zb_product_id || data.productId || '',
    manufacturer: data.manufacturerName || data.zb_manufacturer_name || data.manufacturer || '',
    zclNode: device.zclNode
  };
  const isTuya = isTuyaDP(deviceInfo, device);

  if (isTuya) {
    device.log('[SAFE-MIGRATE] ⚠️  Tuya DP device detected (TS0601/0xEF00)');
    device.log('  AUTO-MIGRATION DISABLED for Tuya DP devices');
    device.log('  Reason: Cluster 0xEF00 not visible, analysis unreliable');
    device.log(`  Current driver will be preserved: ${currentDriverId}`);
    device.log('');
    device.log('  ℹ️  If migration needed, user must:');
    device.log('    1. Remove device from Homey');
    device.log('    2. Re-pair device');
    device.log(`    3. Select correct driver: ${recommendedDriverId}`);
    return false;
  }

  // RULE 5: Prevent migration loops (same driver)
  if (currentDriverId === recommendedDriverId) {
    device.log('[SAFE-MIGRATE] ⏭️  Current driver matches recommended driver');
    device.log('  No migration needed');
    return false;
  }

  // RULE 6: Check if migration already queued
  const { getMigrationQueue } = require('./migration-queue');
  const queue = await getMigrationQueue();
  const alreadyQueued = queue.find(item =>
    item.deviceId === device.getData().id &&
    item.targetDriverId === recommendedDriverId
  );

  if (alreadyQueued) {
    device.log('[SAFE-MIGRATE] ⏭️  Migration already queued');
    return false;
  }

  // ALL RULES PASSED - Queue migration
  device.log('[SAFE-MIGRATE] ✅ All validation checks passed');

  // v5.2.77: Get device ID safely to avoid "Device undefined" in logs
  const deviceData = device.getData?.() || {};
  const deviceId = deviceData.id || device.id || 'unknown';
  const deviceName = device.getName?.() || deviceId;

  device.log(`  Queueing migration: ${deviceName} (${currentDriverId} → ${recommendedDriverId})`);

  await queueMigration(
    device.homey,               // Fix: Pass homey instance (not deviceId!)
    deviceId,                   // deviceId (safely extracted)
    recommendedDriverId,        // targetDriverId
    `${reason} (confidence: ${confidence}%)`  // reason with confidence
  );

  device.log('[SAFE-MIGRATE] ✅ Migration queued successfully');
  device.log('');
  device.log('  ℹ️  Manual migration required (SDK3 limitation):');
  device.log('    1. Open Homey app');
  device.log('    2. Remove this device');
  device.log('    3. Re-pair device');
  device.log(`    4. Select driver: ${recommendedDriverId}`);
  device.log('');
  device.log('  Or check migration queue for batch processing');

  // v5.2.77: Return object instead of boolean to distinguish between
  // "queued for manual migration" vs "automatically migrated"
  // This prevents confusing "SUCCESS - Device migrated automatically!" messages
  return { queued: true, requiresManualAction: true };
}

/**
 * Check if device should be protected from auto-migration
 *
 * Protected devices:
 * - Tuya DP devices (TS0601, cluster 0xEF00)
 * - User preference set
 * - Battery devices (preserve user's battery config)
 *
 * @param {Object} device - Device instance
 * @returns {Promise<Object>} - { protected: boolean, reason: string }
 */
async function isProtectedFromMigration(device) {
  // Check Tuya DP
  const data = device.getData() || {};
  const deviceInfo = {
    modelId: data.modelId || data.zb_product_id || data.productId || '',
    manufacturer: data.manufacturerName || data.zb_manufacturer_name || data.manufacturer || '',
    zclNode: device.zclNode
  };
  const isTuya = isTuyaDP(deviceInfo, device);
  if (isTuya) {
    return {
      protected: true,
      reason: 'Tuya DP device (TS0601/0xEF00) - unreliable cluster analysis'
    };
  }

  // Check user preference
  const userPref = await getUserPreferredDriver(device);
  if (userPref && userPref.driverId === device.driver.id) {
    return {
      protected: true,
      reason: `User explicitly selected driver: ${device.driver.id}`
    };
  }

  // Check battery device
  if (device.hasCapability('measure_battery')) {
    return {
      protected: true,
      reason: 'Battery device - preserve battery configuration'
    };
  }

  // Not protected
  return {
    protected: false,
    reason: null
  };
}

/**
 * Validate migration recommendation
 *
 * @param {Object} device - Device instance
 * @param {string} recommendedDriverId - Recommended driver ID
 * @param {number} confidence - Confidence level (0-100)
 * @returns {Object} - { valid: boolean, reason: string }
 */
function validateMigrationRecommendation(device, recommendedDriverId, confidence) {
  // Check confidence
  if (confidence < 90) {
    return {
      valid: false,
      reason: `Confidence too low: ${confidence}% < 90%`
    };
  }

  // Check target driver exists
  let targetDriver;
  try {
    targetDriver = device.homey.drivers.getDriver(recommendedDriverId);
  } catch (err) {
    targetDriver = null;
  }

  if (!targetDriver) {
    return {
      valid: false,
      reason: `Invalid driver ID: ${recommendedDriverId}`
    };
  }

  // Check not same driver
  if (device.driver.id === recommendedDriverId) {
    return {
      valid: false,
      reason: 'Current driver matches recommended driver'
    };
  }

  // Valid
  return {
    valid: true,
    reason: 'All validation checks passed'
  };
}

module.exports = {
  safeAutoMigrate,
  isProtectedFromMigration,
  validateMigrationRecommendation
};
