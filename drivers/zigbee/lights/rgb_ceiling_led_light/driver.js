'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class ZigbeeLightsDevice extends ZigBeeDevice {
  async onMeshInit() {
    await super.onMeshInit();
    
    this.log('ZigbeeLightsDevice initialized');
    
    // Enable debugging
    this.enableDebug();
    
    // Register capabilities
    
    // Register light capabilities
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('dim', 'genLevelCtrl');
    this.registerCapability('light_hue', 'genLevelCtrl');
    this.registerCapability('light_saturation', 'genLevelCtrl');
    this.registerCapability('light_temperature', 'genLevelCtrl');
    
    // Setup advanced features
    this.setupAdvancedFeatures();
    
    this.log('ZigbeeLightsDevice capabilities registered');
  }

  
    // Register light capabilities
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('dim', 'genLevelCtrl');
    this.registerCapability('light_hue', 'genLevelCtrl');
    this.registerCapability('light_saturation', 'genLevelCtrl');
    this.registerCapability('light_temperature', 'genLevelCtrl');

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('ZigbeeLightsDevice settings changed');
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

module.exports = ZigbeeLightsDevice;