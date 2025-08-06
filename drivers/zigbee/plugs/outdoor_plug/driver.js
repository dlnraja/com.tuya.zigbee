'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class ZigbeePlugsDevice extends ZigBeeDevice {
  async onMeshInit() {
    await super.onMeshInit();
    
    this.log('ZigbeePlugsDevice initialized');
    
    // Enable debugging
    this.enableDebug();
    
    // Register capabilities
    
    // Register plug capabilities
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('measure_power', 'seMetering');
    
    // Setup advanced features
    this.setupAdvancedFeatures();
    
    this.log('ZigbeePlugsDevice capabilities registered');
  }

  
    // Register plug capabilities
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('measure_power', 'seMetering');

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('ZigbeePlugsDevice settings changed');
  }

  setupAdvancedFeatures() {
    // Advanced features for Zigbee devices
    this.setupErrorHandling();
    this.setupLogging();
  }

  setupErrorHandling() {
    this.on('error', (error) => {
      this.error('Device error:', error);
    });
  }

  setupLogging() {
    this.on('data', (data) => {
      this.log('Device data received:', data);
    });
  }
}

module.exports = ZigbeePlugsDevice;