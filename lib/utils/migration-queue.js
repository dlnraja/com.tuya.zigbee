'use strict';

/**
 * Migration Queue System
 *
 * Safe alternative to device.setDriver() (SDK2 only, not available in SDK3)
 *
 * Instead of calling device.setDriver() directly (which crashes):
 * 1. Queue migration request
 * 2. Validate target driver exists
 * 3. Log for user action
 * 4. Optional: Process via worker
 *
 * Why queue instead of direct migration?
 * - device.setDriver() doesn't exist in SDK3
 * - Need to validate target driver exists
 * - User preference should be respected
 * - Manual re-pairing is safer for Tuya devices
 */

const MIGRATION_KEY = 'tuya_migration_queue_v1';

/**
 * Queue a migration request
 *
 * @param {Object} homey - Homey instance (device.homey or app.homey)
 * @param {string} deviceId - Device ID
 * @param {string} targetDriverId - Target driver ID
 * @param {string} reason - Reason for migration
 * @returns {Promise<void>}
 */
async function queueMigration(homey, deviceId, targetDriverId, reason = 'auto') {
  try {
    if (!homey || !homey.settings) {
      console.error('[MIGRATION-QUEUE] Invalid homey instance');
      return;
    }

    const queue = (await homey.settings.get(MIGRATION_KEY)) || [];

    // Check if already queued
    const existing = queue.find(item =>
      item.deviceId === deviceId && item.targetDriverId === targetDriverId
    );

    if (existing) {
      console.log(`[MIGRATION-QUEUE] Device ${deviceId} → ${targetDriverId} already queued`);
      return;
    }

    // Add to queue
    const entry = {
      deviceId,
      targetDriverId,
      reason,
      queuedAt: Date.now(),
      status: 'pending'
    };

    queue.push(entry);
    await homey.settings.set(MIGRATION_KEY, queue);

    console.log(`[MIGRATION-QUEUE] ✅ Queued migration:`);
    console.log(`  Device: ${deviceId}`);
    console.log(`  Target: ${targetDriverId}`);
    console.log(`  Reason: ${reason}`);

  } catch (err) {
    console.error(`[MIGRATION-QUEUE] ❌ Failed to queue migration:`, err.message);
  }
}

/**
 * Get all queued migrations
 *
 * @param {Object} homey - Homey instance
 * @returns {Promise<Array>} - Array of migration entries
 */
async function getMigrationQueue(homey) {
  try {
    if (!homey || !homey.settings) return [];
    const queue = (await homey.settings.get(MIGRATION_KEY)) || [];
    return queue;
  } catch (err) {
    console.error(`[MIGRATION-QUEUE] Failed to get queue:`, err.message);
    return [];
  }
}

/**
 * Pop all migrations (atomic clear)
 *
 * @param {Object} homey - Homey instance
 * @returns {Promise<Array>} - Array of migration entries
 */
async function popMigrations(homey) {
  try {
    if (!homey || !homey.settings) return [];
    const queue = (await homey.settings.get(MIGRATION_KEY)) || [];

    // Clear queue atomically
    await homey.settings.set(MIGRATION_KEY, []);

    console.log(`[MIGRATION-QUEUE] 📤 Popped ${queue.length} migration(s)`);
    return queue;

  } catch (err) {
    console.error(`[MIGRATION-QUEUE] Failed to pop migrations:`, err.message);
    return [];
  }
}

/**
 * Clear migration queue for a specific device
 *
 * @param {Object} homey - Homey instance
 * @param {string} deviceId - Device ID
 * @returns {Promise<void>}
 */
async function clearDeviceMigrations(homey, deviceId) {
  try {
    if (!homey || !homey.settings) return;
    const queue = (await homey.settings.get(MIGRATION_KEY)) || [];

    const filtered = queue.filter(item => item.deviceId !== deviceId);
    await homey.settings.set(MIGRATION_KEY, filtered);

    const removed = queue.length - filtered.length;
    if (removed > 0) {
      console.log(`[MIGRATION-QUEUE] 🗑️  Cleared ${removed} migration(s) for device ${deviceId}`);
    }

  } catch (err) {
    console.error(`[MIGRATION-QUEUE] Failed to clear migrations:`, err.message);
  }
}

/**
 * Process migration queue (called from App.onStart or worker)
 *
 * NOTE: In SDK3, we can't auto-migrate devices.
 * This function logs instructions for user instead.
 *
 * @param {Object} homey - Homey instance
 * @returns {Promise<void>}
 */
async function processMigrationQueue(homey) {
  console.log(`[MIGRATION-QUEUE] 🔄 Processing migration queue...`);

  try {
    const jobs = await popMigrations(homey);

    if (jobs.length === 0) {
      console.log(`[MIGRATION-QUEUE] No migrations to process`);
      return;
    }

    console.log(`[MIGRATION-QUEUE] Processing ${jobs.length} migration(s)...`);

    for (const job of jobs) {
      const { deviceId, currentDriverId, targetDriverId, reason, confidence } = job;

      try {
        // Validate target driver exists
        const targetDriver = homey.drivers.getDriver(targetDriverId);

        if (!targetDriver) {
          console.log(`[MIGRATION-QUEUE] ❌ Target driver not found: ${targetDriverId}`);
          console.log(`  Device: ${deviceId}`);
          console.log(`  Skipping migration`);
          continue;
        }

        // Get device info for better logging
        let deviceName = 'unknown';
        let actualCurrentDriver = currentDriverId || 'unknown';

        try {
          const device = await homey.drivers.getDevice({ id: deviceId });
          if (device) {
            deviceName = device.getName() || deviceId;
            actualCurrentDriver = device.driver ? device.driver.id : actualCurrentDriver;
          }
        } catch (deviceErr) {
          console.log(`[MIGRATION-QUEUE] Could not get device details: ${deviceErr.message}`);
        }

        // Log migration instructions for user
        console.log(`[MIGRATION-QUEUE] 📋 Migration required:`);
        console.log(`  Device ID: ${deviceId || 'undefined'}`);
        console.log(`  Device Name: ${deviceName}`);
        console.log(`  Current Driver: ${actualCurrentDriver}`);
        console.log(`  Target Driver: ${targetDriverId || 'undefined'}`);
        console.log(`  Reason: ${reason || 'Auto-detected'} (confidence: ${confidence || 100}%)`);
        console.log(`  Confidence: ${confidence || 100}%`);
        console.log(``);
        console.log(`  ℹ️  Manual migration steps:`);
        console.log(`    1. Open Homey app`);
        console.log(`    2. Go to device: ${deviceId}`);
        console.log(`    3. Remove device`);
        console.log(`    4. Re-pair device`);
        console.log(`    5. Select driver: ${targetDriverId}`);
        console.log(``);

        // Optional: Send notification to user
        if (homey.notifications && typeof homey.notifications.createNotification === 'function') {
          try {
            await homey.notifications.createNotification({
              excerpt: `Device migration recommended: ${currentDriverId} → ${targetDriverId}`
            });
          } catch (notifErr) {
            console.log(`[MIGRATION-QUEUE] Could not send notification:`, notifErr.message);
          }
        }

      } catch (err) {
        console.error(`[MIGRATION-QUEUE] ❌ Failed to process migration job:`, err.message);
        console.error(`  Device: ${deviceId}`);
        console.error(`  Target: ${targetDriverId}`);
      }
    }

    console.log(`[MIGRATION-QUEUE] ✅ Queue processing complete`);

  } catch (err) {
    console.error(`[MIGRATION-QUEUE] ❌ Queue processing error:`, err.message);
  }
}

/**
 * Get migration statistics
 *
 * @param {Object} homey - Homey instance
 * @returns {Promise<Object>} - Stats object
 */
async function getMigrationStats(homey) {
  try {
    const queue = await getMigrationQueue(homey);

    const stats = {
      total: queue.length,
      byStatus: {},
      byTargetDriver: {},
      avgConfidence: 0
    };

    let totalConfidence = 0;

    for (const item of queue) {
      // By status
      stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;

      // By target driver
      stats.byTargetDriver[item.targetDriverId] = (stats.byTargetDriver[item.targetDriverId] || 0) + 1;

      // Total confidence
      totalConfidence += item.confidence || 0;
    }

    // Average confidence
    if (queue.length > 0) {
      stats.avgConfidence = Math.round(totalConfidence / queue.length);
    }

    return stats;

  } catch (err) {
    console.error(`[MIGRATION-QUEUE] Failed to get stats:`, err.message);
    return { total: 0, byStatus: {}, byTargetDriver: {}, avgConfidence: 0 };
  }
}

module.exports = {
  queueMigration,
  getMigrationQueue,
  popMigrations,
  clearDeviceMigrations,
  processMigrationQueue,
  getMigrationStats
};
