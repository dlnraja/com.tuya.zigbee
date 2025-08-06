'use strict';

const { TuyaDevice } = require('homey-tuya');

class TuyaPlugDriver extends TuyaDevice {
  async onInit() {
    await super.onInit();
    
    this.log('Tuya Plug Driver initialized');
    
    // Register capabilities
    this.registerCapability('onoff', 'switch_1');
    this.registerCapability('measure_power', 'cur_power');
    this.registerCapability('measure_current', 'cur_current');
    this.registerCapability('measure_voltage', 'cur_voltage');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Tuya Plug settings changed');
  }
}

module.exports = TuyaPlugDriver; 