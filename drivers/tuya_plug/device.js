'use strict';

const { Device } = require('homey');
const TuyaDevice = require('tuyapi');

/**
 * @typedef {Object} TuyaDeviceStatus
 * @property {boolean} [onoff] - The power state of the device
 * @property {number} [power] - Current power consumption in watts
 * @property {number} [voltage] - Current voltage in volts
 * @property {number} [current] - Current current in amperes
 * @property {number} [power_consumed] - Total power consumed in kWh
 */

class TuyaPlugDevice extends Device {
  /** @type {TuyaDevice} */
  tuyaDevice = null;
  
  /** @type {NodeJS.Timeout|null} */
  pollingInterval = null;
  
  /** @type {number} */
  powerConsumption = 0;
  
  /** @type {number} */
  totalEnergyConsumed = 0;
  
  /** @type {number} */
  lastEnergyUpdate = 0;
  
  /** @type {Object} */
  status = {
    onoff: false,
    power: 0,
    voltage: 0,
    current: 0,
    power_consumed: 0,
    lastUpdate: 0,
    online: false
  };
  
  /** @type {Object} */
  settings = {
    pollingInterval: 30,
    powerThreshold: 5
  };
  
  /**
   * Initialize the device
   */
  async onInit() {
    this.log('Initializing Tuya Smart Plug...');
    
    // Load settings
    await this.loadSettings();
    
    // Initialize Tuya device
    this.initializeTuyaDevice();
    
    // Register capabilities
    await this.registerCapabilities();
    
    // Set up polling
    this.setupPolling();
    
    // Initial sync
    await this.syncStatus();
    
    this.log('Tuya Smart Plug initialized');
  }
  
  /**
   * Load device settings
   */
  async loadSettings() {
    try {
      const settings = await this.getSettings();
      this.settings.pollingInterval = settings.polling_interval || 30;
      this.settings.powerThreshold = settings.power_threshold || 5;
      this.log('Settings loaded:', this.settings);
    } catch (error) {
      this.error('Failed to load settings:', error);
      // Use defaults if settings can't be loaded
      this.settings.pollingInterval = 30;
      this.settings.powerThreshold = 5;
    }
  }
  
  /**
   * Initialize Tuya device connection
   */
  initializeTuyaDevice() {
    const { id, key, ip } = this.getData();
    
    if (!id || !key) {
      throw new Error('Missing required device ID or key');
    }
    
    this.tuyaDevice = new TuyaDevice({
      id,
      key,
      ip,
      version: '3.3',
      issueRefreshOnConnect: true
    });
    
    // Set up event listeners
    this.tuyaDevice.on('connected', () => {
      this.log('Connected to Tuya device');
      this.setOnline();
    });
    
    this.tuyaDevice.on('disconnected', () => {
      this.log('Disconnected from Tuya device');
      this.setUnavailable('Device disconnected');
    });
    
    this.tuyaDevice.on('error', (error) => {
      this.error('Tuya device error:', error);
      this.setUnavailable(`Error: ${error.message}`);
    });
    
    this.tuyaDevice.on('data', (data) => {
      this.handleDeviceUpdate(data);
    });
    
    // Connect to the device
    this.connectToDevice();
  }
  
  /**
   * Connect to the Tuya device
   */
  async connectToDevice() {
    try {
      await this.tuyaDevice.find();
      await this.tuyaDevice.connect();
      this.setOnline();
    } catch (error) {
      this.error('Failed to connect to device:', error);
      this.setUnavailable(`Connection error: ${error.message}`);
      
      // Try to reconnect after a delay
      setTimeout(() => this.connectToDevice(), 30000);
    }
  }
  
  /**
   * Initialize the device
   * @async
   * @override
   */
  async initialize() {
    try {
      await super.initialize();
      
      // Register capabilities
      await this.registerCapabilities();
      
      // Set up polling
      this.setupPolling();
      
      // Register capability listeners
      this.registerCapabilityListeners();
      
      // Initial sync
      await this.syncStatus();
      
      this.logger.info(`Device ${this.device.name} initialized`);
      this.setAvailable();
      return true;
    } catch (error) {
      this.logger.error(`Failed to initialize device: ${error.message}`, error);
      this.setUnavailable(error.message).catch(this.error);
      throw error;
    }
  }
  
  /**
   * Register device capabilities
   * @async
   */
  async registerCapabilities() {
    // Register on/off capability
    if (!this.hasCapability('onoff')) {
      await this.addCapability('onoff');
    }
    
    // Register power measurement capability if supported
    if (this.getSetting('powerMeasurement') !== false) {
      if (!this.hasCapability('measure_power')) {
        await this.addCapability('measure_power');
      }
      
      if (!this.hasCapability('measure_voltage')) {
        await this.addCapability('measure_voltage');
      }
      
      if (!this.hasCapability('measure_current')) {
        await this.addCapability('measure_current');
      }
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
    
    // Get polling interval from settings or use default (30 seconds)
    const pollingInterval = this.getSetting('polling_interval') || 30;
    
    // Set up polling
    this.pollingInterval = setInterval(async () => {
      try {
        await this.syncStatus();
      } catch (error) {
        this.logger.error('Polling error:', error);
      }
    }, pollingInterval * 1000);
    
    // Initial sync
    this.syncStatus().catch(error => {
      this.logger.error('Initial sync failed:', error);
    });
  }
  
  /**
   * Register capability listeners
   */
  registerCapabilityListeners() {
    // On/Off capability
    this.registerCapabilityListener('onoff', async (value) => {
      try {
        if (value) {
          await this.turnOn();
        } else {
          await this.turnOff();
        }
        return true;
      } catch (error) {
        this.logger.error('Error setting on/off state:', error);
        throw new Error(this.homey.__('errors.set_onoff_failed'));
      }
    });
  }
  
  /**
   * Synchronize device status with Tuya cloud
   * @async
   */
  async syncStatus() {
    try {
      const deviceId = this.getData().id;
      const status = await this.api.getDeviceStatus(deviceId);
      
      if (status) {
        this.online = true;
        
        // Update capabilities based on status
        if (status.onoff !== undefined) {
          await this.setCapabilityValue('onoff', status.onoff).catch(this.error);
        }
        
        if (status.power !== undefined) {
          this.power = status.power;
          await this.setCapabilityValue('measure_power', status.power).catch(this.error);
        }
        
        if (status.voltage !== undefined) {
          this.voltage = status.voltage;
          await this.setCapabilityValue('measure_voltage', status.voltage).catch(this.error);
        }
        
        if (status.current !== undefined) {
          this.current = status.current;
          await this.setCapabilityValue('measure_current', status.current).catch(this.error);
        }
        
        this.setAvailable();
        return true;
      } else {
        this.setUnavailable('Device offline');
        return false;
      }
    } catch (error) {
      this.logger.error('Error syncing device status:', error);
      this.setUnavailable('Sync error');
      throw error;
    }
  }
  
  /**
   * Turn the plug on
   * @async
   */
  async turnOn() {
    try {
      const deviceId = this.getData().id;
      const result = await this.api.setDeviceState(deviceId, { onoff: true });
      
      if (result) {
        await this.setCapabilityValue('onoff', true).catch(this.error);
        this.triggerFlow('power_changed', { power_state: true });
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Error turning device on:', error);
      throw new Error(this.homey.__('errors.turn_on_failed'));
    }
  }
  
  /**
   * Turn the plug off
   * @async
   */
  async turnOff() {
    try {
      const deviceId = this.getData().id;
      const result = await this.api.setDeviceState(deviceId, { onoff: false });
      
      if (result) {
        await this.setCapabilityValue('onoff', false).catch(this.error);
        this.triggerFlow('power_changed', { power_state: false });
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Error turning device off:', error);
      throw new Error(this.homey.__('errors.turn_off_failed'));
    }
  }
  
  /**
   * Toggle the plug power state
   * @async
   */
  async togglePower() {
    const currentState = this.getCapabilityValue('onoff');
    return currentState ? this.turnOff() : this.turnOn();
  }
  
  /**
   * Trigger a flow with the given name and tokens
   * @param {string} flowName - Name of the flow to trigger
   * @param {Object} tokens - Tokens to pass to the flow
   */
  triggerFlow(flowName, tokens) {
    const flow = this.homey.flow.getDeviceTriggerCard(flowName);
    if (flow) {
      flow.trigger(this, tokens, {})
        .catch(err => this.logger.error('Error triggering flow:', err));
    }
  }
  
  /**
   * Clean up when device is deleted
   * @async
   */
  async onDeleted() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    this.logger.info(`Device ${this.device.name} deleted`);
    await super.onDeleted();
  }
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
