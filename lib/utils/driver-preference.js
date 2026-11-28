'use strict';

/**
 * Driver Preference Manager
 * Stores user's manual driver selection to prevent auto-adaptation from overriding it
 *
 * Based on: User feedback - "USB 2 socket s'affecte au mauvais driver meme si bon selectionne"
 *
 * P3400: SDK3 has no ManagerSettings on require('homey') (that was SDK2), so every read
 * returned null and every write was a no-op. Settings now go through the SDK3 instance API
 * `homey.settings` (taken from the device, an explicit homey argument, or bindHomey()).
 * Without a usable settings store the calls stay silent no-ops (never throw).
 */

const PREF_KEY = 'user_preferred_driver_v1';

let _boundHomey = null;

/** Optional: register the app's homey instance for callers that only have a device id. */
function bindHomey(homey) {
  _boundHomey = homey || null;
}

function _settingsOf(homey) {
  const s = homey && homey.settings;
  return s && typeof s.get === 'function' && typeof s.set === 'function' ? s : null;
}

/**
 * Accepts a device id string or a Homey device (SDK3), plus an optional homey instance.
 * @returns {{ id: string|null, settings: object|null }}
 */
function _resolve(deviceOrId, homey) {
  let id = null;
  let deviceHomey = null;
  if (typeof deviceOrId === 'string' || typeof deviceOrId === 'number') {
    id = String(deviceOrId);
  } else if (deviceOrId && typeof deviceOrId === 'object') {
    deviceHomey = deviceOrId.homey || null;
    try {
      const data = typeof deviceOrId.getData === 'function' ? deviceOrId.getData() : null;
      if (data && data.id !== undefined && data.id !== null) {id = String(data.id);}
    } catch (e) { /* no data */ }
  }
  const settings = _settingsOf(homey) || _settingsOf(deviceHomey) || _settingsOf(_boundHomey);
  return { id, settings };
}

async function _readPrefs(settings) {
  const v = await settings.get(PREF_KEY);
  return v && typeof v === 'object' && !Array.isArray(v) ? { ...v } : {};
}

/**
 * Get user's preferred driver for a device
 * @param {string|object} deviceOrId - Device ID or Homey device
 * @param {object} [homey] - Homey instance (optional when a device is passed)
 * @returns {Promise<string|null>} - Driver ID or null
 */
async function getUserPreferredDriver(deviceOrId, homey) {
  try {
    const { id, settings } = _resolve(deviceOrId, homey);
    if (!id || !settings) {return null;}
    const prefs = await _readPrefs(settings);
    return typeof prefs[id] === 'string' && prefs[id] ? prefs[id] : null;
  } catch (e) {
    return null;
  }
}

/**
 * Set user's preferred driver for a device
 * Call this when user manually selects a driver during pairing
 *
 * @param {string|object} deviceOrId - Device ID or Homey device
 * @param {string} driverId - Driver ID chosen by user
 * @param {object} [homey] - Homey instance (optional when a device is passed)
 * @returns {Promise<void>}
 */
async function setUserPreferredDriver(deviceOrId, driverId, homey) {
  try {
    const { id, settings } = _resolve(deviceOrId, homey);
    if (!id || !settings || typeof driverId !== 'string' || !driverId) {return;}
    const prefs = await _readPrefs(settings);
    prefs[id] = driverId;
    await settings.set(PREF_KEY, prefs);
  } catch (e) {
    // Preference set error handled silently
  }
}

/**
 * Clear user's preferred driver for a device
 * Call this when device is removed
 *
 * @param {string|object} deviceOrId - Device ID or Homey device
 * @param {object} [homey] - Homey instance (optional when a device is passed)
 * @returns {Promise<void>}
 */
async function clearUserPreferredDriver(deviceOrId, homey) {
  try {
    const { id, settings } = _resolve(deviceOrId, homey);
    if (!id || !settings) {return;}
    const prefs = await _readPrefs(settings);
    if (!(id in prefs)) {return;}
    delete prefs[id];
    await settings.set(PREF_KEY, prefs);
  } catch (e) {
    // Preference clear error handled silently
  }
}

/**
 * P3424: the driver a user paired a device with IS the user's choice (Homey pairs a Zigbee device only through the
 * driver the user opened in the pair wizard). Record it once on onAdded so safe-auto-migrate / driver-switcher stop
 * second-guessing it; never overwrite an existing preference. Soft: never throws, no-op without homey.settings.
 */
async function recordPairedDriver(device) {
  try {
    const driverId = device && device.driver && device.driver.id;
    if (typeof driverId !== 'string' || !driverId) {return;}
    if (await getUserPreferredDriver(device)) {return;}
    await setUserPreferredDriver(device, driverId);
  } catch (e) { /* soft */ }
}

module.exports = {
  recordPairedDriver,
  getUserPreferredDriver,
  setUserPreferredDriver,
  clearUserPreferredDriver,
  bindHomey,
  PREF_KEY,
};
