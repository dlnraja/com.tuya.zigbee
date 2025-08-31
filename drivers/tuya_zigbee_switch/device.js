'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaZigbeeSwitch extends ZigBeeDevice {
  
  async onNodeInit({ node }) {
    this.log('Tuya Zigbee Switch initializing...');
    
    try {
      // Register capabilities
      await this.registerCapability('onoff', 'genOnOff', {
        get: 'onOff',
        set: 'onOff',
        setParser: value => ({
          onOff: value,
          time: 0,
          transaction: Math.floor(Math.random() * 1000)
        })
      });
      
      // Handle device online/offline
      this.registerCapability('measure_battery', 'genPowerCfg', {
        get: 'batteryPercentageRemaining',
        reportParser: value => value / 2
      });
      
      // Listen for device events
      this.registerReportListener('genOnOff', 'onOff', report => {
        this.setCapabilityValue('onoff', report.onOff === 1);
      });
      
      // Enable device polling
      this.registerCapability('alarm_battery', 'genPowerCfg', {
        get: 'batteryAlarmState',
        reportParser: value => value === 1
      });
      
      this.log('Tuya Zigbee Switch initialized');
      
    } catch (error) {
      this.error('Failed to initialize device:', error);
      throw error;
    }
  }
  
  async onSettings(oldSettings, newSettings, changedKeys) {
    this.log('Device settings updated:', changedKeys);
    
    // Handle settings changes
    if (changedKeys.includes('poll_interval')) {
      const pollInterval = newSettings.poll_interval || 60;
      this.setPollInterval(pollInterval * 1000);
    }
  }
  
  async onDeleted() {
    this.log('Device removed');
    // Clean up any resources
  }
  
  // Custom methods
  async toggle() {
    const currentState = this.getCapabilityValue('onoff');
    return this.setCapabilityValue('onoff', !currentState);
  }
  
  async getDeviceInfo() {
    return {
      name: this.getName(),
      model: this.data.modelId,
      manufacturer: this.data.manufacturerName,
      firmware: this.data.hardwareVersion,
      ieeeAddr: this.getData().ieeeAddr
    };
  }
}

module.exports = TuyaZigbeeSwitch;
