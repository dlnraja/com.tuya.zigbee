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
    
    this.log('ZigbeePlugsDevice capabilities registered');
  }

  
    // Register plug capabilities
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('measure_power', 'seMetering');

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('ZigbeePlugsDevice settings changed');
  }
}

module.exports = ZigbeePlugsDevice;