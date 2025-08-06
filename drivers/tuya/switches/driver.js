'use strict';

const { TuyaDevice } = require('homey-tuya');

class TuyaSwitchDriver extends TuyaDevice {
  async onInit() {
    await super.onInit();
    
    this.log('Tuya Switch Driver initialized');
    
    // Register capabilities
    this.registerCapability('onoff', 'switch_1');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Tuya Switch settings changed');
  }
}

module.exports = TuyaSwitchDriver; 