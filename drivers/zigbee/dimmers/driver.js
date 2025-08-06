'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class ZigbeeDimmersDevice extends ZigBeeDevice {
  async onMeshInit() {
    await super.onMeshInit();
    
    this.log('ZigbeeDimmersDevice initialized');
    
    // Enable debugging
    this.enableDebug();
    
    // Register capabilities
    
    // Register dimmer capabilities
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('dim', 'genLevelCtrl');
    
    this.log('ZigbeeDimmersDevice capabilities registered');
  }

  
    // Register dimmer capabilities
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('dim', 'genLevelCtrl');

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('ZigbeeDimmersDevice settings changed');
  }
}

module.exports = ZigbeeDimmersDevice;