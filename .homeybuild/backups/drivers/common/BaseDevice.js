'use strict';

const { ZigbeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const { EventEmitter } = require('events');
const ErrorHandler = require('./errorHandler');
const { POLLING_INTERVALS_MS, TUYA_CLUSTER_ID } = require('./constants');

class BaseDevice extends ZigbeeDevice {
  /**
   * Device initialization
   * @param {Object} options - Device initialization options
   * @param {Object} options.zclNode - The ZCL node instance
   */
  async onNodeInit({ zclNode }) {
    this.log(`[${this.constructor.name}] Device initialized: ${this.getName()}`);
    this._events = new EventEmitter();
    this._batteryPollInterval = null;
    this._lastBatteryUpdate = null;

    // Enable debug mode if configured
    if (this.getSetting('debug_enabled')) {
      this.enableDebug();
      this.printNode();
      this.log('[DEBUG] Debug logging enabled');
    }

    try {
      // Register device capabilities
      this.log(`[${this.constructor.name}] Registering capabilities...`);
      await this.registerCapabilities();

      // Initialize device-specific logic
      this.log(`[${this.constructor.name}] Initializing device...`);
      await this.initializeDevice();

      // Set up battery polling if supported
      if (this.hasCapability('measure_battery')) {
        this.log(`[${this.constructor.name}] Setting up battery polling...`);
        await this.setupBatteryPolling();
      }

      // Set up Tuya-specific handlers if available
      if (this.supportsTuyaCluster()) {
        this.log(`[${this.constructor.name}] Setting up Tuya cluster handlers...`);
        this.setupTuyaHandlers();
      }

      this.log(`[${this.constructor.name}] Initialization complete`);
      this._events.emit('initialized');
    } catch (error) {
      const errorMessage = `[${this.constructor.name}] Initialization failed: ${error.message}`;
      this.error(errorMessage, error);
      ErrorHandler.handleDeviceError(this, error, 'initialization');
      throw error;
    }
  }

  async registerCapabilities() {
    // This method should be overridden by child classes
    this.log('Registering capabilities...');
  }

  async initializeDevice() {
    // This method can be overridden by child classes for custom initialization
    this.log('Initializing device specific logic...');
  }

  setupBatteryPolling() {
    this.log('Setting up battery polling...');
    this.batteryPollInterval = this.homey.setInterval(async () => {
      try {
        await this.zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME].readAttributes('batteryPercentageRemaining');
      } catch (error) {
        ErrorHandler.handleDeviceError(this, error, 'batteryPolling');
      }
    }, POLLING_INTERVALS_MS.BATTERY);
  }

  async safeReadAttributes(cluster, attributes) {
    try {
      return await this.zclNode.endpoints[1].clusters[cluster].readAttributes(attributes);
    } catch (error) {
      ErrorHandler.handleDeviceError(this, error, `readAttributes_${cluster}`);
      return null;
    }
  }

  /**
   * Generic handler for Tuya-specific datapoint messages.
   * @param {object} payload The datapoint payload.
   */
  onTuyaData(payload) {
    if (typeof this.onDatapoint === 'function') {
      this.onDatapoint(payload.dp, payload.data);
    } else {
      this.log('onDatapoint method not implemented for this device, skipping Tuya data parsing');
    }
  }

  onDeleted() {
    if (this.batteryPollInterval) {
      this.homey.clearInterval(this.batteryPollInterval);
    }
    this.log(`Device ${this.getName()} has been deleted.`);
  }
}

module.exports = BaseDevice;
