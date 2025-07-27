'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');
const { CLUSTER } = require('zigbee-clusters');

class Socketpowerstripfour extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    // SDK3 compatibility - Homey Mini/Bridge/Pro
    await super.onNodeInit({ zclNode });
    
    this.log('Socketpowerstripfour SDK3 Enhanced initialized');
    
    // Enhanced capabilities with SDK3 syntax
    await this.registerCapability('onoff', CLUSTER.ON_OFF);
    
    // Enhanced metering capabilities
    if (this.hasCapability('measure_power')) {
      await this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT);
    }
    if (this.hasCapability('measure_current')) {
      await this.registerCapability('measure_current', CLUSTER.ELECTRICAL_MEASUREMENT);
    }
    if (this.hasCapability('measure_voltage')) {
      await this.registerCapability('measure_voltage', CLUSTER.ELECTRICAL_MEASUREMENT);
    }
    if (this.hasCapability('measure_battery')) {
      await this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION);
    }
    
    // Enhanced settings with defaults
    this.meteringOffset = this.getSetting('metering_offset') || 0;
    this.measureOffset = (this.getSetting('measure_offset') || 0) * 100;
    this.minReportPower = (this.getSetting('minReportPower') || 0) * 1000;
    this.minReportCurrent = (this.getSetting('minReportCurrent') || 0) * 1000;
    this.minReportVoltage = (this.getSetting('minReportVoltage') || 0) * 1000;
    
    // Enhanced logging
    this.printNode();
  }
  
  // SDK3 compatible methods with enhanced error handling
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    await super.onSettings({ oldSettings, newSettings, changedKeys });
    this.log('Enhanced settings updated:', changedKeys);
    
    // Update enhanced settings
    if (changedKeys.includes('metering_offset')) {
      this.meteringOffset = newSettings.metering_offset || 0;
    }
    if (changedKeys.includes('measure_offset')) {
      this.measureOffset = (newSettings.measure_offset || 0) * 100;
    }
    if (changedKeys.includes('minReportPower')) {
      this.minReportPower = (newSettings.minReportPower || 0) * 1000;
    }
    if (changedKeys.includes('minReportCurrent')) {
      this.minReportCurrent = (newSettings.minReportCurrent || 0) * 1000;
    }
    if (changedKeys.includes('minReportVoltage')) {
      this.minReportVoltage = (newSettings.minReportVoltage || 0) * 1000;
    }
  }
  
  async onDeleted() {
    await super.onDeleted();
    this.log('Socketpowerstripfour Enhanced deleted');
  }
  
  // Enhanced error handling
  async onError(error) {
    this.log('Enhanced error handling:', error);
    await super.onError(error);
  }
}

module.exports = Socketpowerstripfour;

