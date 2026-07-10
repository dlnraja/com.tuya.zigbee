'use strict';
// v9.0.40: Capability Migration Helper
// Inspired by gpmachado/com.gpm.homesuite migrateCapabilities.js
// Handles driver updates that add/remove capabilities gracefully

/**
 * Migrate capabilities on a device
 * @param {object} device - Homey device instance
 * @param {object} options
 * @param {string[]} options.remove - Capabilities to remove
 * @param {string[]} options.ensure - Capabilities to add if missing
 * @param {string[]} options.rename - [{from, to}] capabilities to rename
 */
async function migrateCapabilities(device, { remove = [], ensure = [], rename = [] } = {}) {
  let migrated = false;

  // Remove deprecated capabilities
  for (const cap of remove) {
    if (device.hasCapability(cap)) {
      try {
        await device.removeCapability(cap);
        device.log(`[Migration] Removed capability: ${cap}`);
        migrated = true;
      } catch (err) {
        device.error(`[Migration] Failed to remove ${cap}:`, err.message);
      }
    }
  }

  // Rename capabilities (remove old + add new, preserving value)
  for (const { from, to } of rename) {
    if (device.hasCapability(from) && !device.hasCapability(to)) {
      try {
        const value = device.getCapabilityValue(from);
        await device.removeCapability(from);
        await device.addCapability(to);
        if (value !== null && value !== undefined) {
          await device.setCapabilityValue(to, value).catch(() => {});
        }
        device.log(`[Migration] Renamed capability: ${from} → ${to}`);
        migrated = true;
      } catch (err) {
        device.error(`[Migration] Failed to rename ${from} → ${to}:`, err.message);
      }
    }
  }

  // Ensure required capabilities exist
  for (const cap of ensure) {
    if (!device.hasCapability(cap)) {
      try {
        await device.addCapability(cap);
        device.log(`[Migration] Added capability: ${cap}`);
        migrated = true;
      } catch (err) {
        device.error(`[Migration] Failed to add ${cap}:`, err.message);
      }
    }
  }

  return migrated;
}

/**
 * Check if this is the first initialization after a driver update
 * Uses device store to track migration state
 * @param {object} device - Homey device instance
 * @param {string} version - Current migration version
 * @returns {boolean}
 */
function needsMigration(device, version) {
  const stored = device.getStoreValue('_migrationVersion');
  return stored !== version;
}

/**
 * Mark migration as complete
 * @param {object} device - Homey device instance
 * @param {string} version - Migration version to store
 */
async function markMigrationComplete(device, version) {
  await device.setStoreValue('_migrationVersion', version).catch(() => {});
}

/**
 * Safe settings batch correction
 * Clamps out-of-bounds settings and persists corrections in one call
 * Inspired by gpmachado/com.gpm.homesuite safeGetNumberSettings.js
 * @param {object} device - Homey device instance
 * @param {object} specs - { settingName: { min, max, default } }
 * @returns {object} Corrected settings values
 */
async function safeCorrectSettings(device, specs) {
  const settings = device.getSettings();
  const corrections = {};
  const values = {};

  for (const [key, spec] of Object.entries(specs)) {
    let val = settings[key];
    if (val === undefined || val === null) {
      val = spec.default;
    }
    if (typeof val === 'number') {
      if (spec.min !== undefined && val < spec.min) {
        corrections[key] = spec.min;
        val = spec.min;
      }
      if (spec.max !== undefined && val > spec.max) {
        corrections[key] = spec.max;
        val = spec.max;
      }
    }
    values[key] = val;
  }

  // Persist all corrections in a single setSettings() call
  if (Object.keys(corrections).length > 0) {
    device.log(`[Settings] Correcting ${Object.keys(corrections).length} out-of-bounds settings`);
    await device.setSettings(corrections).catch(err => {
      device.error('[Settings] Failed to correct settings:', err.message);
    });
  }

  return values;
}

module.exports = {
  migrateCapabilities,
  needsMigration,
  markMigrationComplete,
  safeCorrectSettings,
};
