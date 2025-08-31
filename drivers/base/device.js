const { EventEmitter } = require('events');
const Homey = require('homey');
const { Log } = require('homey-log');

/**
 * Base device class for all Tuya Zigbee devices
 * @extends Homey.Device
 */
class TuyaZigbeeDevice extends Homey.Device {
  /**
   * Device initialization
   */
  async onInit() {
    this.logger = new Log({ homey: this.homey, logLevel: 3 });
    this.events = new EventEmitter();
    this.initialized = false;
    this.capabilities = new Set();
    this.settings = {};
    
    try {
      // Load device settings
      await this.loadSettings();
      
      // Initialize capabilities
      await this.initializeCapabilities();
      
      // Register event listeners
      this.registerEventListeners();
      
      // Mark as initialized
      this.initialized = true;
      this.logger.info(`Device ${this.getName()} initialized successfully`);
    } catch (error) {
      this.logger.error(`Error initializing device ${this.getName()}:`, error);
      throw error;
    }
  }

  /**
   * Load device settings
   */
  async loadSettings() {
    try {
      this.settings = this.getSettings() || {};
      this.logger.debug(`Loaded settings for ${this.getName()}:`, this.settings);
    } catch (error) {
      this.logger.error('Error loading settings:', error);
      throw error;
    }
  }

  /**
   * Initialize device capabilities
   */
  async initializeCapabilities() {
    try {
      const manifest = this.getManifest();
      const driverCapabilities = manifest.capabilities || [];
      
      // Store supported capabilities
      driverCapabilities.forEach(capability => {
        this.capabilities.add(capability);
      });
      
      this.logger.debug(`Initialized capabilities for ${this.getName()}:`, [...this.capabilities]);
    } catch (error) {
      this.logger.error('Error initializing capabilities:', error);
      throw error;
    }
  }

  /**
   * Register event listeners
   */
  registerEventListeners() {
    // Homey events
    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
    
    // Custom events
    this.events.on('settingsChanged', this.onSettingsChanged.bind(this));
    this.events.on('capabilityChanged', this.onCapabilityChanged.bind(this));
  }

  /**
   * Handle capability changes
   * @param {Object} value - New capability value
   * @param {Object} opts - Additional options
   */
  async onCapabilityOnoff(value, opts = {}) {
    try {
      this.logger.debug(`Capability 'onoff' changed to ${value} for ${this.getName()}`);
      
      // Implement device-specific logic here
      // Example: await this.sendCommand('onoff', value);
      
      return true;
    } catch (error) {
      this.logger.error(`Error handling 'onoff' capability:`, error);
      throw error;
    }
  }

  /**
   * Handle settings changes
   * @param {Object} oldSettings - Previous settings
   * @param {Object} newSettings - New settings
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    try {
      this.logger.debug(`Settings changed for ${this.getName()}:`, changedKeys);
      
      // Update local settings
      this.settings = { ...this.settings, ...newSettings };
      
      // Emit settings changed event
      this.events.emit('settingsChanged', { oldSettings, newSettings, changedKeys });
      
      return true;
    } catch (error) {
      this.logger.error('Error handling settings change:', error);
      throw error;
    }
  }

  /**
   * Handle settings changed event
   * @param {Object} data - Settings change data
   */
  async onSettingsChanged(data) {
    // Implement in child classes if needed
  }

  /**
   * Handle capability changed event
   * @param {string} capability - Capability name
   * @param {*} value - New value
   * @param {Object} opts - Additional options
   */
  async onCapabilityChanged(capability, value, opts = {}) {
    try {
      this.logger.debug(`Capability '${capability}' changed to ${value} for ${this.getName()}`);
      
      // Update capability value
      await this.setCapabilityValue(capability, value);
      
      return true;
    } catch (error) {
      this.logger.error(`Error handling capability '${capability}' change:`, error);
      throw error;
    }
  }

  /**
   * Send command to device
   * @param {string} command - Command to send
   * @param {*} data - Command data
   */
  async sendCommand(command, data) {
    try {
      this.logger.debug(`Sending command '${command}' to ${this.getName()}:`, data);
      
      // Implement device communication logic here
      // Example: return this.homey.zigbee.sendCommand(this, command, data);
      
      return true;
    } catch (error) {
      this.logger.error(`Error sending command '${command}':`, error);
      throw error;
    }
  }

  /**
   * Clean up when device is deleted
   */
  async onDeleted() {
    try {
      this.logger.info(`Device ${this.getName()} is being deleted`);
      
      // Clean up event listeners
      this.events.removeAllListeners();
      
      // Perform any necessary cleanup
      await this.cleanup();
      
      this.logger.info(`Device ${this.getName()} deleted successfully`);
    } catch (error) {
      this.logger.error(`Error deleting device ${this.getName()}:`, error);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    // Implement in child classes if needed
  }
}

module.exports = TuyaZigbeeDevice;
