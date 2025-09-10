#!/usr/bin/env node
'use strict';

const { Homey } = require('homey');
const logger = require('@utils/logger');
const { AppError } = require('@utils/errorHandler');

/**
 * Base driver class for all Tuya Zigbee devices
 * @extends Homey.Driver
 */
class BaseDriver extends Homey.Driver {
  /**
   * Initialize the driver
   * @param {Object} options - Driver options
   */
  async onInit(options = {}) {
    try {
      this.log('Initializing driver...');
      
      // Set driver metadata
      this.id = this.constructor.name;
      this.version = '1.0.0';
      this.config = this.getDriverConfig();
      
      // Initialize logger with driver context
      this.logger = logger.child({ driver: this.id });
      
      // Initialize driver state
      this.initialized = false;
      this.devices = new Map();
      
      // Register flow cards and events
      await this.registerFlowCards();
      
      // Initialize driver-specific logic
      await this.initializeDriver();
      
      this.initialized = true;
      this.log('Driver initialized successfully');
      
    } catch (error) {
      this.error('Error initializing driver:', error);
      throw error;
    }
  }
  
  /**
   * Get driver configuration
   * @returns {Object} Driver configuration
   */
  getDriverConfig() {
    return {
      ...this.getManifest(),
      capabilities: this.getCapabilities(),
      capabilitiesOptions: this.getCapabilitiesOptions(),
      deviceTypes: this.getDeviceTypes(),
      pair: this.getPairSettings(),
    };
  }
  
  /**
   * Initialize driver-specific logic
   * Override this method in child classes
   */
  async initializeDriver() {
    // To be implemented by child classes
  }
  
  /**
   * Register flow cards and events
   */
  async registerFlowCards() {
    try {
      // Register flow cards
      this.homey.flow
        .getDeviceTriggerCard('device_connected')
        .registerRunListener((args, state) => {
          return args.device.getId() === state.deviceId;
        });
      
      // Add more flow cards as needed
      
      this.log('Flow cards registered');
    } catch (error) {
      this.error('Error registering flow cards:', error);
      throw error;
    }
  }
  
  /**
   * Get device types supported by this driver
   * @returns {Array} Array of supported device types
   */
  getDeviceTypes() {
    return [];
  }
  
  /**
   * Get pair settings for the driver
   * @returns {Object} Pair settings
   */
  getPairSettings() {
    return {
      view: 'list_devices',
      device: 'device',
    };
  }
  
  /**
   * Handle device initialization
   * @param {Homey.Device} device - The device instance
   */
  async onPairListDevices() {
    try {
      this.log('Starting device discovery...');
      
      // Implement device discovery logic here
      const devices = await this.discoverDevices();
      
      this.log(`Found ${devices.length} devices`);
      return devices;
      
    } catch (error) {
      this.error('Error discovering devices:', error);
      throw new AppError('Failed to discover devices', 500, 'DEVICE_DISCOVERY_ERROR', { error });
    }
  }
  
  /**
   * Discover devices
   * Override this method in child classes
   * @returns {Promise<Array>} Array of discovered devices
   */
  async discoverDevices() {
    // To be implemented by child classes
    return [];
  }
  
  /**
   * Handle device added event
   * @param {Homey.Device} device - The device instance
   */
  async onPair(device) {
    try {
      this.log(`Pairing device: ${device.getName()}`);
      
      // Add device to internal map
      this.devices.set(device.getData().id, device);
      
      // Initialize device
      await this.initializeDevice(device);
      
      this.log(`Device paired successfully: ${device.getName()}`);
      
    } catch (error) {
      this.error(`Error pairing device ${device.getName()}:`, error);
      throw new AppError(
        `Failed to pair device: ${error.message}`,
        500,
        'DEVICE_PAIRING_ERROR',
        { device: device.getData(), error }
      );
    }
  }
  
  /**
   * Initialize a device
   * @param {Homey.Device} device - The device instance
   */
  async initializeDevice(device) {
    try {
      this.log(`Initializing device: ${device.getName()}`);
      
      // Set device availability
      await device.setUnavailable('Initializing...');
      
      // Register device event listeners
      this.registerDeviceListeners(device);
      
      // Set device as available
      await device.setAvailable();
      
      this.log(`Device initialized: ${device.getName()}`);
      
    } catch (error) {
      this.error(`Error initializing device ${device.getName()}:`, error);
      await device.setUnavailable(`Initialization failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Register device event listeners
   * @param {Homey.Device} device - The device instance
   */
  registerDeviceListeners(device) {
    // Device deleted
    device.registerRunListener('delete', async (args, state) => {
      try {
        this.log(`Deleting device: ${device.getName()}`);
        await this.onDeviceDeleted(device);
        this.devices.delete(device.getData().id);
        return true;
      } catch (error) {
        this.error(`Error deleting device ${device.getName()}:`, error);
        throw error;
      }
    });
    
    // Device settings changed
    device.registerSettingsListener(async (newSettings) => {
      try {
        this.log(`Settings changed for device: ${device.getName()}`, newSettings);
        await this.onSettingsChanged(device, newSettings);
      } catch (error) {
        this.error(`Error updating settings for device ${device.getName()}:`, error);
        throw error;
      }
    });
  }
  
  /**
   * Handle device deleted event
   * @param {Homey.Device} device - The device instance
   */
  async onDeviceDeleted(device) {
    // Clean up resources when a device is deleted
    this.log(`Device deleted: ${device.getName()}`);
  }
  
  /**
   * Handle device settings changed event
   * @param {Homey.Device} device - The device instance
   * @param {Object} newSettings - The new settings
   */
  async onSettingsChanged(device, newSettings) {
    // Handle settings changes
    this.log(`Settings updated for ${device.getName()}:`, newSettings);
  }
  
  /**
   * Log a debug message
   * @param {...any} args - Arguments to log
   */
  debug(...args) {
    this.logger.debug(...args);
  }
  
  /**
   * Log an info message
   * @param {...any} args - Arguments to log
   */
  log(...args) {
    this.logger.info(...args);
  }
  
  /**
   * Log a warning message
   * @param {...any} args - Arguments to log
   */
  warn(...args) {
    this.logger.warn(...args);
  }
  
  /**
   * Log an error message
   * @param {...any} args - Arguments to log
   */
  error(...args) {
    this.logger.error(...args);
  }
  
  /**
   * Clean up resources when the driver is being destroyed
   */
  async onUninit() {
    try {
      this.log('Cleaning up driver resources...');
      
      // Clean up all devices
      for (const [id, device] of this.devices) {
        try {
          await this.onDeviceDeleted(device);
        } catch (error) {
          this.error(`Error cleaning up device ${id}:`, error);
        }
      }
      
      this.devices.clear();
      this.initialized = false;
      
      this.log('Driver cleanup completed');
    } catch (error) {
      this.error('Error during driver cleanup:', error);
      throw error;
    }
  }
}

module.exports = BaseDriver;
