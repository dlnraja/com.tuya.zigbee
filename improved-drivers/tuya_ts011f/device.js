'use strict';

const { ZigbeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');


/**
 * Tuya TS011F device
 * Smart Plug with USB and Power Monitoring
 * 
 * @class TuyaTs011fDevice
 * @extends {ZigbeeDevice}
 */
class TuyaTs011fDevice extends ZigbeeDevice {
  /**
   * onInit is called when the device is initialized.
   */
  async onNodeInit() {
    this.log('TuyaTs011fDevice has been initialized');
    
    // Enable debugging
    this.enableDebug();
    
    // Print the node info for debugging
    this.printNode();
    
    // Register capabilities with their clusters
    this.registerCapability('onoff', 'onoff');
    this.registerCapability('usb_onoff', 'onoff');
    this.registerCapability('measure_power', 'measure');
    this.registerCapability('meter_power', 'onoff');
    this.registerCapability('measure_voltage', 'measure');
    this.registerCapability('measure_current', 'measure');
    
    // Configure reporting for capabilities
    
    
    await this.configurePowerReporting();
    
    
    // Register event listeners
    
    
    // Call parent onNodeInit
    await super.onNodeInit();
  }
  
  /**
   * onAdded is called when the user adds the device.
   */
  async onAdded() {
    this.log('TuyaTs011fDevice has been added');
  }
  
  /**
   * onSettings is called when the user changes the device settings.
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('TuyaTs011fDevice settings were changed:', changedKeys);
    
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
    this.log('TuyaTs011fDevice was renamed to', name);
  }
  
  /**
   * onDeleted is called when the user deletes the device.
   */
  async onDeleted() {
    this.log('TuyaTs011fDevice has been deleted');
    await super.onDeleted();
  }
  
  // Capability handlers
  
  /**
   * Handle "onoff" capability
   */
  async onCapabilityOnOff(value, opts = {}) {
    this.log('onCapabilityOnOff:', value);
    
    try {
      // Send command to device
      await this.zclNode.endpoints[1].clusters.onOff.set({ onOff: value });
      
      // Update device state
      this.setCapabilityValue('onoff', value).catch(this.error);
      
      return true;
    } catch (error) {
      this.error('Error setting onoff:', error);
      throw error;
    }
  }


  /**
   * Configure power reporting
   */
  async configurePowerReporting() {
    try {
      await this.configureReporting('electricalMeasurement', {
        minInterval: 0,
        maxInterval: 300,
        minChange: 5, // 5W
      }, 'activePower');
      this.log('Configured power reporting');
    } catch (error) {
      this.error('Failed to configure power reporting:', error);
    }
  }
  
  // Cluster bindings and configuration
  zigbee: {
    vendor: 'Tuya',
    description: 'Smart Plug with USB and Power Monitoring',
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
      // On/Off cluster
      onOff: {
        attributes: {
          onOff: {}
        },
        commands: {
          off: true,
          on: true,
          toggle: true
        }
      },

      // Electrical Measurement cluster
      electricalMeasurement: {
        attributes: {
          activePower: {},
          rmsVoltage: {},
          rmsCurrent: {}
        }
      }
    }
  }
}

module.exports = TuyaTs011fDevice;