'use strict';

const { ZigbeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');


/**
 * Tuya TS0201 device
 * Temperature & Humidity Sensor
 * 
 * @class TuyaTs0201Device
 * @extends {ZigbeeDevice}
 */
class TuyaTs0201Device extends ZigbeeDevice {
  /**
   * onInit is called when the device is initialized.
   */
  async onNodeInit() {
    this.log('TuyaTs0201Device has been initialized');
    
    // Enable debugging
    this.enableDebug();
    
    // Print the node info for debugging
    this.printNode();
    
    // Register capabilities with their clusters
    this.registerCapability('measure_temperature', 'measure');
    this.registerCapability('measure_humidity', 'measure');
    this.registerCapability('measure_battery', 'measure');
    this.registerCapability('alarm_battery', 'measure');
    
    // Configure reporting for capabilities
    await this.configureTemperatureReporting();
    await this.configureHumidityReporting();
    
    await this.configureBatteryReporting();
    
    // Register event listeners
    
    
    // Call parent onNodeInit
    await super.onNodeInit();
  }
  
  /**
   * onAdded is called when the user adds the device.
   */
  async onAdded() {
    this.log('TuyaTs0201Device has been added');
  }
  
  /**
   * onSettings is called when the user changes the device settings.
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('TuyaTs0201Device settings were changed:', changedKeys);
    
    // Handle settings changes here
    for (const key of changedKeys) {
      switch (key) {
        case 'sensitivity':
          // Handle sensitivity change
          break;
        case 'reportingInterval':
          // Update reporting intervals
          break;
        // Add more settings handlers as needed
      }
    }
  }
  
  /**
   * onRenamed is called when the user changes the device name.
   */
  async onRenamed(name) {
    this.log('TuyaTs0201Device was renamed to', name);
  }
  
  /**
   * onDeleted is called when the user deletes the device.
   */
  async onDeleted() {
    this.log('TuyaTs0201Device has been deleted');
    await super.onDeleted();
  }
  
  // Capability handlers
  
  /**
   * Configure temperature reporting
   */
  async configureTemperatureReporting() {
    try {
      await this.configureReporting('temperatureMeasurement', {
        minInterval: 0,
        maxInterval: 300,
        minChange: 10, // 0.1°C
      });
      this.log('Configured temperature reporting');
    } catch (error) {
      this.error('Failed to configure temperature reporting:', error);
    }
  }


  /**
   * Configure humidity reporting
   */
  async configureHumidityReporting() {
    try {
      await this.configureReporting('humidityMeasurement', {
        minInterval: 0,
        maxInterval: 300,
        minChange: 20, // 0.5%
      });
      this.log('Configured humidity reporting');
    } catch (error) {
      this.error('Failed to configure humidity reporting:', error);
    }
  }


  /**
   * Configure battery reporting
   */
  async configureBatteryReporting() {
    try {
      await this.configureReporting('powerConfiguration', {
        minInterval: 0,
        maxInterval: 3600, // 1 hour
        minChange: 5, // 5%
      }, 'batteryPercentageRemaining');
      this.log('Configured battery reporting');
    } catch (error) {
      this.error('Failed to configure battery reporting:', error);
    }
  }
  
  // Cluster bindings and configuration
  zigbee: {
    vendor: 'Tuya',
    description: 'Temperature & Humidity Sensor',
    fromZigbee: [
      // Add fromZigbee converters here
    ],
    toZigbee: [
      // Add toZigbee converters here
    ],
    exposes: [
      // Add Home Assistant MQTT discovery exposes here
    ],
    bindings: {
      // Temperature Measurement cluster
      temperatureMeasurement: {
        attributes: {
          measuredValue: {}
        }
      },

      // Humidity Measurement cluster
      humidityMeasurement: {
        attributes: {
          measuredValue: {}
        }
      },

      // Power Configuration cluster
      powerConfiguration: {
        attributes: {
          batteryPercentageRemaining: {}
        }
      }
    }
  }
}

module.exports = TuyaTs0201Device;