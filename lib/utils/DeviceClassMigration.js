'use strict';

/**
 * One-shot device class migration for already-paired devices.
 *
 * WHY: a "class" change in driver.compose.json only applies to new pairings.
 * Homey Apps SDK v3 (Device#setClass, "How to handle breaking changes") says to
 * migrate existing devices from onInit, only when needed, never on every init.
 * A store flag keeps it one-shot; failures are logged and never block init.
 */
async function migrateDeviceClass(device, target, fromClasses = ['socket', 'other']) {
  if (!device || typeof device.getClass !== 'function' || typeof device.setClass !== 'function') {
    return false;
  }
  const flag = `classMigrated_${target}`;
  try {
    if (typeof device.getStoreValue === 'function' && device.getStoreValue(flag)) {
      return false;
    }
    const current = device.getClass();
    if (current !== target && !fromClasses.includes(current)) {
      return false;
    }
    if (current !== target) {
      await device.setClass(target);
      if (typeof device.log === 'function') {
        device.log(`[CLASS] migrated ${current} -> ${target}`);
      }
    }
    if (typeof device.setStoreValue === 'function') {
      await device.setStoreValue(flag, true);
    }
    return current !== target;
  } catch (err) {
    if (typeof device.error === 'function') {
      device.error(`[CLASS] migration to ${target} failed: ${err && err.message}`);
    }
    return false;
  }
}

module.exports = { migrateDeviceClass };
