'use strict';

/**
 * Driver Preference Manager
 * Stores user's manual driver selection to prevent auto-adaptation from overriding it
 * 
 * Based on: User feedback - "USB 2 socket s'affecte au mauvais driver même si bon sélectionné"
 */

const PREF_KEY = 'user_preferred_driver_v1';

/**
 * Get user's preferred driver for a device
 * @param {string} deviceId - Device ID
 * @returns {Promise<string|null>} - Driver ID or null
 */
async function getUserPreferredDriver(deviceId) {
  try {
    const Homey = require('homey');
    const prefs = await Homey.ManagerSettings.get(PREF_KEY) || {};
    return prefs[deviceId] || null;
  } catch (e) {
    return null;
  }
}

/**
 * Set user's preferred driver for a device
 * Call this when user manually selects a driver during pairing
 * 
 * @param {string} deviceId - Device ID
 * @param {string} driverId - Driver ID chosen by user
 * @returns {Promise<void>}
 */
async function setUserPreferredDriver(deviceId, driverId) {
  try {
    const Homey = require('homey');
    const prefs = await Homey.ManagerSettings.get(PREF_KEY) || {};
    prefs[deviceId] = driverId;
    await Homey.ManagerSettings.set(PREF_KEY, prefs);
  } catch (e) {
    // Preference set error handled silently
  }
}

/**
 * Clear user's preferred driver for a device
 * Call this when device is removed
 * 
 * @param {string} deviceId - Device ID
 * @returns {Promise<void>}
 */
async function clearUserPreferredDriver(deviceId) {
  try {
    const Homey = require('homey');
    const prefs = await Homey.ManagerSettings.get(PREF_KEY) || {};
    delete prefs[deviceId];
    await Homey.ManagerSettings.set(PREF_KEY, prefs);
  } catch (e) {
    // Preference clear error handled silently
  }
}

module.exports = {
  getUserPreferredDriver,
  setUserPreferredDriver,
  clearUserPreferredDriver
};
