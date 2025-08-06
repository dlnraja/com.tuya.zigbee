'use strict';

const { TuyaDevice } = require('homey-tuya');

class TuyaLightDriver extends TuyaDevice {
  async onInit() {
    await super.onInit();
    
    this.log('Tuya Light Driver initialized');
    
    // Register capabilities
    this.registerCapability('onoff', 'switch_1');
    this.registerCapability('dim', 'brightness_1');
    this.registerCapability('light_hue', 'colour_data');
    this.registerCapability('light_saturation', 'colour_data');
    this.registerCapability('light_temperature', 'colour_data');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Tuya Light settings changed');
  }
}

module.exports = TuyaLightDriver; 