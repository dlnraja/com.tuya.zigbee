'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class ZigbeeSecurityDevice extends ZigBeeDevice {
  async onMeshInit() {
    await super.onMeshInit();
    
    this.log('ZigbeeSecurityDevice initialized');
    
    // Enable debugging
    this.enableDebug();
    
    // Register capabilities
    
    // Register security capabilities
    this.registerCapability('alarm_motion', 'msOccupancySensing');
    this.registerCapability('alarm_contact', 'genOnOff');
    
    // Setup advanced features
    this.setupAdvancedFeatures();
    
    this.log('ZigbeeSecurityDevice capabilities registered');
  }

  
    // Register security capabilities
    this.registerCapability('alarm_motion', 'msOccupancySensing');
    this.registerCapability('alarm_contact', 'genOnOff');

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('ZigbeeSecurityDevice settings changed');
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

module.exports = ZigbeeSecurityDevice;