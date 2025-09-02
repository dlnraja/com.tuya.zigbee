'use strict';

const Homey = require('homey');
const BaseDevice = require('../../lib/BaseDevice');

/**
 * Device class for Tuya Smart Plug
 * @extends BaseDevice
 */
class TuyaPlugDevice extends BaseDevice {
  /**
   * Initialize the device
   * @param {Object} device - Device configuration
   * @param {Object} api - Tuya API client
   */
  constructor(device, api) {
    super(device, api);
    
    // Device specific properties
    this.pollingInterval = null;
    this.powerConsumption = 0;
    this.voltage = 0;
    this.current = 0;
    
    // Bind methods
    this.onPoll = this.onPoll.bind(this);
  }
  
  /**
   * Initialize the device
   * @async
   * @override
   */
  async initialize() {
    try {
      await super.initialize();
      
      // Set up polling
      this.setupPolling();
      
      // Register capability listeners
      this.registerCapabilityListeners();
      
      // Initial sync
      await this.syncStatus();
      
      this.logger.info(`Device ${this.device.name} initialized`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to initialize device: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Set up polling for device status
   */
  setupPolling() {
    // Clear existing interval if any
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    // Set up new polling interval (every 30 seconds)
    this.pollingInterval = setInterval(() => {
      this.syncStatus().catch(error => {
        this.logger.error('Error during status sync:', error);
      });
    }, 30000);
    
    // Initial sync after 5 seconds
    setTimeout(() => {
      this.syncStatus().catch(error => {
        this.logger.error('Error during initial status sync:', error);
      });
    }, 5000);
  }
  
  /**
   * Register capability listeners
   */
  registerCapabilityListeners() {
    // On/Off capability
    this.registerCapabilityListener('onoff', async (value) => {
      try {
        this.logger.info(`Setting power state to: ${value}`);
        
        // Call Tuya API to update device state
        const success = await this.api.setDeviceState(this.device.id, {
          power: value
        });
        
        if (!success) {
          throw new Error('Failed to update device state');
        }
        
        // Update local state
        this.status.power = value;
        this.emit('status', this.status);
        
        // Trigger flow cards
        if (value) {
          this.homey.flow.getDeviceTriggerCard('plug_turned_on')
            .trigger(this)
            .catch(err => this.logger.error('Error triggering flow:', err));
        } else {
          this.homey.flow.getDeviceTriggerCard('plug_turned_off')
            .trigger(this)
            .catch(err => this.logger.error('Error triggering flow:', err));
        }
        
        return true;
      } catch (error) {
        this.logger.error(`Failed to set power state: ${error.message}`, error);
        throw error;
      }
    });
    
    // Register other capability listeners as needed
  }
  
  /**
   * Handle polling
   * @private
   */
  async onPoll() {
    try {
      await this.syncStatus();
    } catch (error) {
      this.logger.error('Error during poll:', error);
    }
  }
  
  /**
   * Sync device status with Tuya cloud
   * @async
   * @override
   */
  async syncStatus() {
    try {
      this.logger.debug('Syncing device status...');
      
      // Get device status from Tuya API
      const status = await this.api.getDeviceStatus(this.device.id);
      
      if (!status) {
        throw new Error('Failed to get device status');
      }
      
      // Parse status
      const parsedStatus = TuyaUtils.parseDeviceStatus(this.device, status);
      
      // Update device state
      this.status = {
        ...this.status,
        ...parsedStatus,
        lastUpdated: new Date().toISOString(),
      };
      
      // Update capabilities
      await this.updateCapabilities();
      
      // Emit status update
      this.emit('status', this.status);
      
      return this.status;
    } catch (error) {
      this.logger.error(`Failed to sync status: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Update Homey capabilities based on device status
   * @async
   */
  async updateCapabilities() {
    try {
      // Update on/off state
      if (this.status.power !== undefined) {
        await this.setCapabilityValue('onoff', this.status.power);
      }
      
      // Update power measurement if available
      if (this.status.power_consumption !== undefined) {
        await this.setCapabilityValue('measure_power', this.status.power_consumption);
      }
      
      // Update energy consumption if available
      if (this.status.energy_consumed !== undefined) {
        await this.setCapabilityValue('meter_power', this.status.energy_consumed);
      }
      
      // Update other capabilities as needed
      
    } catch (error) {
      this.logger.error(`Failed to update capabilities: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Clean up resources when device is deleted
   * @async
   * @override
   */
  async onDeleted() {
    try {
      // Clear polling interval
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
      
      // Clean up base device
      await super.destroy();
      
      this.logger.info(`Device ${this.device.name} deleted`);
    } catch (error) {
      this.logger.error(`Error during device deletion: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Get device info
   * @returns {Object} Device information
   * @override
   */
  getInfo() {
    return {
      ...super.getInfo(),
      type: 'tuya_plug',
      model: this.device.model || 'Tuya Smart Plug',
      firmware: this.status.firmware || '1.0.0',
      powerConsumption: this.powerConsumption,
      voltage: this.voltage,
      current: this.current,
    };
  }
}

module.exports = TuyaPlugDevice;
