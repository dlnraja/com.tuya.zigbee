'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaGenericSwitchDriver extends ZigBeeDriver {

  onInit() {
    super.onInit();
    
    this.log('Generic Tuya Switch (1-6 gangs) driver initialized');
    
    
    // Generic driver initialization
    this.autoDetectCapabilities = true;
    this.supportedModels = new Set();
    
    // Register for device discovery
    this.on('device_init', this.onDeviceInit.bind(this));
  }

  
  async onDeviceInit(device) {
    // Auto-detect device capabilities based on clusters
    const clusters = await device.getClusterEndpoints();
    const detectedCapabilities = this.detectCapabilities(clusters);
    
    // Update device capabilities
    for (const capability of detectedCapabilities) {
      if (!device.hasCapability(capability)) {
        await device.addCapability(capability);
      }
  }

  detectCapabilities(clusters) {
    const capabilities = [];
    
    Object.values(clusters).forEach(endpoint => {
      if (endpoint.clusters.includes('genOnOff')) {
        capabilities.push('onoff');
      }
      
      if (endpoint.clusters.includes('genLevelCtrl')) {
        capabilities.push('dim');
      }
      
      if (endpoint.clusters.includes('lightingColorCtrl')) {
        capabilities.push('light_hue', 'light_saturation', 'light_temperature');
      }
      
      if (endpoint.clusters.includes('msTemperatureMeasurement')) {
        capabilities.push('measure_temperature');
      }
      
      if (endpoint.clusters.includes('msRelativeHumidity')) {
        capabilities.push('measure_humidity');
      }
      
      if (endpoint.clusters.includes('haElectricalMeasurement')) {
        capabilities.push('measure_power');
      }
      
      if (endpoint.clusters.includes('seMetering')) {
        capabilities.push('meter_power');
      }
    });
    
    return [...new Set(capabilities)];
  }

}

module.exports = TuyaGenericSwitchDriver;