'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class ZigbeeSensorsDevice extends ZigBeeDevice {
  async onMeshInit() {
    await super.onMeshInit();
    
    this.log('ZigbeeSensorsDevice initialized');
    
    // Enable debugging
    this.enableDebug();
    
    // Register capabilities
    
    // Register sensor capabilities
    this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
    this.registerCapability('measure_humidity', 'msRelativeHumidity');
    this.registerCapability('alarm_motion', 'msOccupancySensing');
    
    this.log('ZigbeeSensorsDevice capabilities registered');
  }

  
    // Register sensor capabilities
    this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
    this.registerCapability('measure_humidity', 'msRelativeHumidity');
    this.registerCapability('alarm_motion', 'msOccupancySensing');

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('ZigbeeSensorsDevice settings changed');
  }
}

module.exports = ZigbeeSensorsDevice;