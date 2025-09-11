#!/usr/bin/env node
'use strict';

/**
 * @typedef {import('homey').Device} Device
 * @typedef {import('homey').Driver} Driver
 */

const Logger = require('./logger');

/**
 * Enhanced function/class
 */
class TuyaHelpers {
  
  /**
   * Normalize device model string
   * @param {string} model - The device model string
   * @returns {string} Normalized model
   */
  static normalizeModel(model) {
    if (!model) return 'default';
    return model
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 32)
      .toLowerCase();
  }
  
  /**
   * Get Data Point value from state
   * @param {number} dp - Data Point ID
   * @param {Record<number, any>} state - Device state object
   * @returns {*} Value of the Data Point
   */
  static getDpValue(dp, state) {
    return state[dp];
  }
  
  /**
   * Set Data Point value in state
   * @param {number} dp - Data Point ID
   * @param {*} value - Value to set
   * @param {Record<number, any>} state - Device state object
   */
  static setDpValue(dp, value, state) {
    state[dp] = value;
  }
  
  /**
   * Map capability to Data Point ID
   * @param {string} capability - Capability ID
   * @param {Record<string, number>} mappings - Capability to DP mappings
   * @returns {number} Data Point ID
   */
  static mapCapabilityToDp(capability, mappings) {
    return mappings[capability];
  }
  
  /**
   * Send command to device
   * @param {any} device - Homey device instance (expected to have sendCommand method)
   * @param {Object[]} commands - Array of commands to send
   * @returns {Promise<boolean>} True if successful
   */
  static async sendCommand(device, commands) {
    try {
      // Check if device has sendCommand method
      if (typeof device.sendCommand !== 'function') {
        throw new Error('Device does not have sendCommand method');
      }
      
      await device.sendCommand(commands);
      return true;
    } catch (error) {
      // Use console.error if device.error is not available
      if (typeof device.error === 'function') {
        device.error(`Failed to send command:`, error);
      } else {
        console.error(`Failed to send command:`, error);
      }
      return false;
    }
  }
  
  /**
   * Discover devices using the provided discovery function
   * @param {function} discoveryFunction - Function to discover devices
   * @returns {Promise<any[]>} Array of discovered devices
   */
  static async discoverDevices(discoveryFunction) {
    try {
      const devices = await discoveryFunction();
      return devices;
    } catch (error) {
      throw new Error(`Discovery failed: ${error.message}`);
    }
  }

  /**
   * Validate a device object
   * @param {object} device - Device object to validate
   * @throws {Error} If the device object is invalid
   */
  static validateDevice(device) {
    if (!device || !device.data || !device.data.id) {
      throw new Error('Invalid device object');
    }
  }
  
  // Fonctions d'aide pour la normalisation des appareils Tuya
  static tuyaHelpers = {
    normalizeDeviceModel: (model) => {
      return model.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    },
    dpToCapabilityMap: {
      // Mappage des DPs vers les capacités Homey
    }
  };
}

module.exports = {
  normalizeModel: (m) => { return (m||'').toString().trim(); },
  mapDpToCapability: (dp, value) => { /* detailed mapping table */ },
  safeJSON: (s) => { try { return JSON.parse(s); } catch(e){ return null; } },
  TuyaHelpers
};
