'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class ZigbeeCoversDevice extends ZigBeeDevice {
  async onMeshInit() {
    await super.onMeshInit();
    
    this.log('ZigbeeCoversDevice initialized');
    
    // Enable debugging
    this.enableDebug();
    
    // Register capabilities
    
    // Register cover capabilities
    this.registerCapability('windowcoverings_state', 'genWindowCovering');
    this.registerCapability('windowcoverings_set', 'genWindowCovering');
    
    this.log('ZigbeeCoversDevice capabilities registered');
  }

  
    // Register cover capabilities
    this.registerCapability('windowcoverings_state', 'genWindowCovering');
    this.registerCapability('windowcoverings_set', 'genWindowCovering');

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('ZigbeeCoversDevice settings changed');
  }
}

module.exports = ZigbeeCoversDevice;