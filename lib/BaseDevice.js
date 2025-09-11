#!/usr/bin/env node
'use strict';

'use strict';

const { EventEmitter } = require('events');
const Homey = require('homey');
const TuyaUtils = require('./utils/tuya');
const config = require('./config');

/**
 * Base device /**
 * Enhanced function/class
 */
class for all Tuya Zigbee devices
 * @extends EventEmitter
 */
/**
 * Enhanced function/class
 */
class BaseDevice extends EventEmitter {
  /**
   * Create a new BaseDevice
   * @param {Object} device - Device configuration
   * @param {Object} api - Tuya API client
   */
  constructor(device, api) {
    super();
    
    this.device = device;
    this.api = api;
    this.logger = new Homey.Log(`device-${device.id}`);
    this.initialized = false;
    this.online = false;
    this.status = {};
    this.capabilities = new Set();
    this.settings = {};
    
    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.destroy = this.destroy.bind(this);
    this._onStatusUpdate = this._onStatusUpdate.bind(this);
    this._onDeviceOnline = this._onDeviceOnline.bind(this);
    this._onDeviceOffline = this._onDeviceOffline.bind(this);
    this._onDeviceUpdate = this._onDeviceUpdate.bind(this);
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Set up event listeners
   * @private
   */
  setupEventListeners() {
    this.on('status', this._onStatusUpdate);
    this.on('online', this._onDeviceOnline);
    this.on('offline', this._onDeviceOffline);
    this.on('update', this._onDeviceUpdate);
  }
  
  /**
   * Initialize the device
   * @async
   * @returns {Promise<boolean>} True if initialization was successful
   */
  async initialize() {
    try {
      this.logger.info(`Initializing device: ${this.device.name} (${this.device.id})`);
      
      // Load device capabilities
      await this.loadCapabilities();
      
      // Load device settings
      await this.loadSettings();
      
      // Mark as initialized
      this.initialized = true;
      
      // Set initial status
      await this.syncStatus();
      
      this.logger.info(`Device initialized: ${this.device.name}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to initialize device: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Load device capabilities
   * @async
   * @protected
   */
  async loadCapabilities() {
    try {
      // Get capabilities from device configuration or product ID
      const productCapabilities = TuyaUtils.getCapabilitiesForProduct(this.device.productKey);
      
      // Add capabilities to the set
      productCapabilities.forEach(capability => {
        this.capabilities.add(capability);
      });
      
      this.logger.debug(`Loaded capabilities: ${Array.from(this.capabilities).join(', ')}`);
    } catch (error) {
      this.logger.error(`Failed to load capabilities: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Load device settings
   * @async
   * @protected
   */
  async loadSettings() {
    try {
      // Load settings from device or use defaults
      this.settings = {
        pollingInterval: config.drivers.pollingInterval,
        ...this.device.settings,
      };
      
      this.logger.debug('Loaded device settings:', this.settings);
    } catch (error) {
      this.logger.error(`Failed to load settings: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Sync device status
   * @async
   * @returns {Promise<Object>} Device status
   */
  async syncStatus() {
    try {
      this.logger.debug('Syncing device status...');
      
      // Get device status from Tuya API
      const status = await this.api.getDeviceStatus(this.device.id);
      
      // Update local status
      this.status = TuyaUtils.parseDeviceStatus(this.device, status);
      this.online = status.online || false;
      
      // Emit status update event
      this.emit('status', this.status);
      
      // Emit online/offline event
      if (this.online) {
        this.emit('online');
      } else {
        this.emit('offline');
      }
      
      return this.status;
    } catch (error) {
      this.logger.error(`Failed to sync status: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Handle status update
   * @param {Object} status - New status
   * @private
   */
  _onStatusUpdate(status) {
    this.logger.debug('Status updated:', status);
    // Update Homey device state here
  }
  
  /**
   * Handle device online event
   * @private
   */
  _onDeviceOnline() {
    this.logger.info('Device is online');
    this.online = true;
    // Handle online state in Homey
  }
  
  /**
   * Handle device offline event
   * @private
   */
  _onDeviceOffline() {
    this.logger.warn('Device is offline');
    this.online = false;
    // Handle offline state in Homey
  }
  
  /**
   * Handle device update
   * @param {Object} update - Update data
   * @private
   */
  _onDeviceUpdate(update) {
    this.logger.debug('Device updated:', update);
    // Handle device update in Homey
  }
  
  /**
   * Destroy the device and clean up resources
   * @async
   */
  async destroy() {
    try {
      this.logger.info(`Destroying device: ${this.device.name}`);
      
      // Remove event listeners
      this.removeAllListeners();
      
      // Clean up resources
      this.initialized = false;
      this.status = {};
      this.capabilities.clear();
      
      this.logger.info(`Device destroyed: ${this.device.name}`);
    } catch (error) {
      this.logger.error(`Failed to destroy device: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Get device info
   * @returns {Object} Device information
   */
  getInfo() {
    return {
      id: this.device.id,
      name: this.device.name,
      model: this.device.model,
      productKey: this.device.productKey,
      online: this.online,
      capabilities: Array.from(this.capabilities),
      settings: this.settings,
      status: this.status,
    };
  }
}

module.exports = BaseDevice;
