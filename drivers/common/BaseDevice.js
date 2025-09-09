'use strict';

const { ZigbeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const ErrorHandler = require('./errorHandler');
const { POLLING_INTERVALS_MS } = require('./constants');

class BaseDevice extends ZigbeeDevice {
  async onNodeInit({ zclNode }) {
    this.log(`Device initialized: ${this.getName()}`);

    if (this.getSetting('debug_enabled')) {
      this.enableDebug();
      this.printNode();
    }

    try {
      await this.registerCapabilities();
      await this.initializeDevice();

      if (this.hasCapability('measure_battery')) {
        this.setupBatteryPolling();
      }

      // Listen for Tuya-specific datapoint messages
      if (this.zclNode.endpoints[1].clusters[CLUSTERS.TUYA_MANUFACTURER_CLUSTER]) {
        this.zclNode.endpoints[1].clusters[CLUSTERS.TUYA_MANUFACTURER_CLUSTER].on('data', this.onTuyaData.bind(this));
      }
    } catch (error) {
      ErrorHandler.handleDeviceError(this, error, 'initialization');
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
