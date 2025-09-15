#!/usr/bin/env node
'use strict';

const { Homey } = require('homey');
const logger = require('@utils/logger');
const { AppError } = require('@utils/errorHandler');

/**
 * Base device class for all Tuya Zigbee devices
 * @extends Homey.Device
 */
class BaseDevice extends Homey.Device {
  /**
   * Initialize the device
   */
  async onInit() {
    try {
      // Initialize logger with device context
      this.logger = logger.child({
        deviceId: this.getData().id,
        deviceName: this.getName(),
        deviceClass: this.constructor.name,
      });

      // Set device state
      this.initialized = false;
      this.connected = false;
      this.capabilities = this.getCapabilities();
      
      // Initialize device settings
      await this.initializeSettings();
      
      // Register event listeners
      this.registerEventListeners();
      
      // Connect to the device
      await this.connect();
      
      // Mark as initialized
      this.initialized = true;
      this.log('Device initialized');
      
    } catch (error) {
      this.error('Error initializing device:', error);
      await this.setUnavailable(`Initialization failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Initialize device settings
   */
  async initializeSettings() {
    try {
      const settings = this.getSettings();
      
      // Set default settings if not set
      const defaultSettings = this.getDefaultSettings();
      const updatedSettings = { ...defaultSettings, ...settings };
      
      // Save settings if they were updated
      if (JSON.stringify(settings) !== JSON.stringify(updatedSettings)) {
        await this.setSettings(updatedSettings);
      }
      
    } catch (error) {
      this.error('Error initializing settings:', error);
      throw new AppError(
        'Failed to initialize device settings',
        500,
        'DEVICE_SETTINGS_ERROR',
        { error }
      );
    }
  }
  
  /**
   * Get default device settings
   * Override this method in child classes
   * @returns {Object} Default settings
   */
  getDefaultSettings() {
    return {
      pollInterval: 300, // 5 minutes
      reconnectAttempts: 5,
      reconnectDelay: 5000, // 5 seconds
    };
  }
  
  /**
   * Register event listeners
   */
  registerEventListeners() {
    // Handle device being deleted
    this.registerCapabilityListener('deleted', async () => {
      await this.onDeleted();
    });
    
    // Handle settings changes
    this.registerSettingsListener(async (newSettings, oldSettings, changedKeys) => {
      await this.onSettingsChanged(newSettings, oldSettings, changedKeys);
    });
    
    // Handle device being renamed
    this.registerCapabilityListener('name', async (value, opts) => {
      await this.onRenamed(value, opts);
    });
  }
  
  /**
   * Connect to the device
   */
  async connect() {
    try {
      if (this.connected) {
        return;
      }
      
      this.log('Connecting to device...');
      
      // Set device as unavailable while connecting
      await this.setUnavailable('Connecting...');
      
      // Implement connection logic in child classes
      await this.performConnection();
      
      // Start polling if needed
      if (this.getSetting('pollInterval') > 0) {
        this.startPolling();
      }
      
      // Mark as connected and available
      this.connected = true;
      await this.setAvailable();
      
      this.log('Connected to device');
      
    } catch (error) {
      this.error('Error connecting to device:', error);
      await this.handleConnectionError(error);
      throw error;
    }
  }
  
  /**
   * Perform the actual device connection
   * Override this method in child classes
   */
  async performConnection() {
    // To be implemented by child classes
    return Promise.resolve();
  }
  
  /**
   * Disconnect from the device
   */
  async disconnect() {
    try {
      if (!this.connected) {
        return;
      }
      
      this.log('Disconnecting from device...');
      
      // Stop polling
      this.stopPolling();
      
      // Implement disconnection logic in child classes
      await this.performDisconnection();
      
      // Mark as disconnected
      this.connected = false;
      await this.setUnavailable('Disconnected');
      
      this.log('Disconnected from device');
      
    } catch (error) {
      this.error('Error disconnecting from device:', error);
      throw error;
    }
  }
  
  /**
   * Perform the actual device disconnection
   * Override this method in child classes
   */
  async performDisconnection() {
    // To be implemented by child classes
    return Promise.resolve();
  }
  
  /**
   * Handle connection errors
   * @param {Error} error - The error that occurred
   */
  async handleConnectionError(error) {
    this.error('Connection error:', error);
    
    // Set device as unavailable
    await this.setUnavailable(`Connection error: ${error.message}`);
    
    // Attempt to reconnect if needed
    if (this.getSetting('reconnectAttempts') > 0) {
      this.log(`Attempting to reconnect (${this.reconnectAttempts || 0}/${this.getSetting('reconnectAttempts')})...`);
      await this.attemptReconnect();
    }
  }
  
  /**
   * Attempt to reconnect to the device
   */
  async attemptReconnect() {
    if (this.reconnectAttempts >= this.getSetting('reconnectAttempts')) {
      this.error(`Max reconnection attempts (${this.getSetting('reconnectAttempts')}) reached`);
      return;
    }
    
    this.reconnectAttempts = (this.reconnectAttempts || 0) + 1;
    
    setTimeout(async () => {
      try {
        await this.connect();
        this.reconnectAttempts = 0; // Reset counter on successful connection
      } catch (error) {
        this.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, error);
        await this.attemptReconnect();
      }
    }, this.getSetting('reconnectDelay'));
  }
  
  /**
   * Start polling device for updates
   */
  startPolling() {
    this.stopPolling(); // Clear any existing interval
    
    const pollInterval = this.getSetting('pollInterval') * 1000; // Convert to milliseconds
    
    if (pollInterval > 0) {
      this.pollingInterval = setInterval(() => {
        this.poll()
          .catch(error => {
            this.error('Error during poll:', error);
          });
      }, pollInterval);
      
      this.log(`Started polling every ${pollInterval}ms`);
    }
  }
  
  /**
   * Stop polling device
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.log('Stopped polling');
    }
  }
  
  /**
   * Poll device for updates
   * Override this method in child classes
   */
  async poll() {
    // To be implemented by child classes
    return Promise.resolve();
  }
  
  /**
   * Handle device being deleted
   */
  async onDeleted() {
    this.log('Device is being deleted');
    
    try {
      // Clean up resources
      await this.disconnect();
      
      // Perform any additional cleanup
      await this.performCleanup();
      
      this.log('Device cleanup completed');
      
    } catch (error) {
      this.error('Error during device cleanup:', error);
      throw error;
    }
  }
  
  /**
   * Perform additional cleanup when device is deleted
   * Override this method in child classes
   */
  async performCleanup() {
    // To be implemented by child classes
    return Promise.resolve();
  }
  
  /**
   * Handle settings changes
   * @param {Object} newSettings - New settings
   * @param {Object} oldSettings - Previous settings
   * @param {Array} changedKeys - Array of changed setting keys
   */
  async onSettingsChanged(newSettings, oldSettings, changedKeys) {
    this.log('Settings changed:', { newSettings, oldSettings, changedKeys });
    
    // Handle poll interval changes
    if (changedKeys.includes('pollInterval')) {
      if (this.pollingInterval) {
        this.startPolling(); // Restart polling with new interval
      }
    }
    
    // Notify child class about settings change
    await this.handleSettingsUpdate(newSettings, oldSettings, changedKeys);
  }
  
  /**
   * Handle settings update
   * Override this method in child classes
   * @param {Object} newSettings - New settings
   * @param {Object} oldSettings - Previous settings
   * @param {Array} changedKeys - Array of changed setting keys
   */
  async handleSettingsUpdate(newSettings, oldSettings, changedKeys) {
    // To be implemented by child classes
    return Promise.resolve();
  }
  
  /**
   * Handle device being renamed
   * @param {string} newName - New device name
   * @param {Object} opts - Additional options
   */
  async onRenamed(newName, opts) {
    this.log(`Device renamed to: ${newName}`);
    // Additional logic can be added here if needed
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
   * Clean up when the device is being unloaded
   */
  async onUnload() {
    try {
      this.log('Unloading device...');
      
      // Disconnect from the device
      await this.disconnect();
      
      // Perform any additional cleanup
      await this.performCleanup();
      
      this.log('Device unloaded');
      
    } catch (error) {
      this.error('Error unloading device:', error);
      throw error;
    }
  }
}

module.exports = BaseDevice;
