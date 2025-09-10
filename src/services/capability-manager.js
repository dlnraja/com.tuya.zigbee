#!/usr/bin/env node
'use strict';

'use strict';

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

/**
 * Capability Manager Service
 * Manages device capabilities and their handlers
 */
class CapabilityManager extends EventEmitter {
  /**
   * Create a new CapabilityManager instance
   * @param {Object} options - Configuration options
   * @param {Object} options.logger - Logger instance
   */
  constructor({ logger }) {
    super();
    this.logger = logger || console;
    
    // Capability handlers storage
    this.capabilityHandlers = new Map();
    
    // Default capabilities for device types
    this.defaultCapabilities = {
      switch: ['onoff'],
      light: ['onoff', 'dim', 'light_temperature', 'light_hue', 'light_saturation', 'light_mode'],
      sensor: ['measure_temperature', 'measure_humidity', 'measure_pressure', 'measure_battery'],
      thermostat: ['target_temperature', 'measure_temperature', 'thermostat_mode'],
      cover: ['windowcoverings_state', 'windowcoverings_set'],
      lock: ['locked', 'lock_mode']
    };
    
    // Initialize default capability handlers
    this._initializeDefaultHandlers();
  }

  /**
   * Initialize default capability handlers
   * @private
   */
  _initializeDefaultHandlers() {
    // On/Off capability
    this.registerCapabilityHandler('onoff', {
      get: async (device) => {
        return device.state?.onoff || false;
      },
      set: async (device, value) => {
        // Default implementation that can be overridden by devices
        if (device.sendCommand) {
          await device.sendCommand('set_onoff', { value });
          return true;
        }
        throw new Error('Device does not support on/off commands');
      }
    });

    // Dim capability
    this.registerCapabilityHandler('dim', {
      get: async (device) => {
        return device.state?.dim || 0;
      },
      set: async (device, value) => {
        if (device.sendCommand) {
          await device.sendCommand('set_dim', { value });
          return true;
        }
        throw new Error('Device does not support dimming');
      }
    });

    // Temperature measurement
    this.registerCapabilityHandler('measure_temperature', {
      get: async (device) => {
        return device.state?.temperature || null;
      }
    });

    // Humidity measurement
    this.registerCapabilityHandler('measure_humidity', {
      get: async (device) => {
        return device.state?.humidity || null;
      }
    });
  }

  /**
   * Register a new capability handler
   * @param {string} capabilityId - Capability ID (e.g., 'onoff', 'dim')
   * @param {Object} handlers - Handler methods
   * @param {Function} handlers.get - Getter function
   * @param {Function} [handlers.set] - Setter function (optional for read-only capabilities)
   */
  registerCapabilityHandler(capabilityId, { get, set }) {
    if (!capabilityId || typeof capabilityId !== 'string') {
      throw new Error('Invalid capability ID');
    }
    
    if (typeof get !== 'function') {
      throw new Error('Capability handler must have a get function');
    }
    
    this.capabilityHandlers.set(capabilityId, { get, set });
    this.logger.debug(`Registered handler for capability: ${capabilityId}`);
  }

  /**
   * Get a capability handler
   * @param {string} capabilityId - Capability ID
   * @returns {Object|null} Capability handler or null if not found
   */
  getCapabilityHandler(capabilityId) {
    return this.capabilityHandlers.get(capabilityId) || null;
  }

  /**
   * Check if a capability is supported
   * @param {string} capabilityId - Capability ID to check
   * @returns {boolean} True if capability is supported
   */
  hasCapability(capabilityId) {
    return this.capabilityHandlers.has(capabilityId);
  }

  /**
   * Get the value of a capability for a device
   * @param {Object} device - Device object
   * @param {string} capabilityId - Capability ID
   * @returns {Promise<*>} Capability value
   */
  async getCapabilityValue(device, capabilityId) {
    const handler = this.getCapabilityHandler(capabilityId);
    if (!handler) {
      throw new Error(`No handler registered for capability: ${capabilityId}`);
    }
    
    try {
      const value = await handler.get(device);
      this.logger.debug(`Got ${capabilityId} value for ${device.id}:`, value);
      return value;
    } catch (error) {
      this.logger.error(`Error getting ${capabilityId} value for ${device.id}:`, error);
      throw error;
    }
  }

  /**
   * Set the value of a capability for a device
   * @param {Object} device - Device object
   * @param {string} capabilityId - Capability ID
   * @param {*} value - Value to set
   * @returns {Promise<boolean>} True if successful
   */
  async setCapabilityValue(device, capabilityId, value) {
    const handler = this.getCapabilityHandler(capabilityId);
    if (!handler) {
      throw new Error(`No handler registered for capability: ${capabilityId}`);
    }
    
    if (typeof handler.set !== 'function') {
      throw new Error(`Capability ${capabilityId} is read-only`);
    }
    
    try {
      this.logger.debug(`Setting ${capabilityId} for ${device.id} to:`, value);
      const result = await handler.set(device, value);
      this.emit('capability:updated', { device, capability: capabilityId, value });
      return result;
    } catch (error) {
      this.logger.error(`Error setting ${capabilityId} for ${device.id}:`, error);
      throw error;
    }
  }

  /**
   * Get default capabilities for a device type
   * @param {string} deviceType - Device type (e.g., 'light', 'switch')
   * @returns {Array<string>} Array of capability IDs
   */
  getDefaultCapabilities(deviceType) {
    return this.defaultCapabilities[deviceType] || [];
  }

  /**
   * Add or update default capabilities for a device type
   * @param {string} deviceType - Device type
   * @param {Array<string>} capabilities - Array of capability IDs
   */
  setDefaultCapabilities(deviceType, capabilities) {
    if (!Array.isArray(capabilities)) {
      throw new Error('Capabilities must be an array');
    }
    
    this.defaultCapabilities[deviceType] = [...new Set(capabilities)]; // Remove duplicates
    this.logger.debug(`Updated default capabilities for ${deviceType}:`, this.defaultCapabilities[deviceType]);
  }
}

module.exports = CapabilityManager;
