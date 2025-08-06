'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class ZigbeeOnoffDevice extends ZigBeeDevice {
  async onMeshInit() {
    await super.onMeshInit();
    
    this.log('ZigbeeOnoffDevice initialized');
    
    // Enable debugging
    this.enableDebug();
    
    // Register capabilities
    
    // Register onoff capabilities
    this.registerCapability('onoff', 'genOnOff');
    
    this.log('ZigbeeOnoffDevice capabilities registered');
  }

  
    // Register onoff capabilities
    this.registerCapability('onoff', 'genOnOff');

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('ZigbeeOnoffDevice settings changed');
  }
}

module.exports = ZigbeeOnoffDevice;