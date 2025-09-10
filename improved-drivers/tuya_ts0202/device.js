'use strict';

const { ZigbeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');


/**
 * Tuya TS0202 device
 * Motion Sensor
 * 
 * @class TuyaTs0202Device
 * @extends {ZigbeeDevice}
 */
class TuyaTs0202Device extends ZigbeeDevice {
  /**
   * onInit is called when the device is initialized.
   */
  async onNodeInit() {
    this.log('TuyaTs0202Device has been initialized');
    
    // Enable debugging
    this.enableDebug();
    
    // Print the node info for debugging
    this.printNode();
    
    // Register capabilities with their clusters
    this.registerCapability('alarm_motion', 'measure');
    this.registerCapability('measure_luminance', 'measure');
    this.registerCapability('measure_battery', 'measure');
    this.registerCapability('alarm_battery', 'measure');
    
    // Configure reporting for capabilities
    
    
    
    await this.configureBatteryReporting();
    
    // Register event listeners
    this.registerOccupancyListener();
    
    // Call parent onNodeInit
    await super.onNodeInit();
  }
  
  /**
   * onAdded is called when the user adds the device.
   */
  async onAdded() {
    this.log('TuyaTs0202Device has been added');
  }
  
  /**
   * onSettings is called when the user changes the device settings.
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('TuyaTs0202Device settings were changed:', changedKeys);
    
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
    this.log('TuyaTs0202Device was renamed to', name);
  }
  
  /**
   * onDeleted is called when the user deletes the device.
   */
  async onDeleted() {
    this.log('TuyaTs0202Device has been deleted');
    await super.onDeleted();
  }
  
  // Capability handlers
  
  /**
   * Handle occupancy change
   */
  onOccupancyChange(occupancy) {
    this.log('onOccupancyChange:', occupancy);
    this.setCapabilityValue('alarm_motion', occupancy).catch(this.error);
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
    description: 'Motion Sensor',
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
      // Occupancy Sensing cluster
      occupancySensing: {
        attributes: {
          occupancy: {}
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

module.exports = TuyaTs0202Device;