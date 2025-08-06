'use strict';

const { TuyaDevice } = require('homey-tuya');

class TuyaSensorDriver extends TuyaDevice {
  async onInit() {
    await super.onInit();
    
    this.log('Tuya Sensor Driver initialized');
    
    // Register capabilities based on sensor type
    this.registerCapability('measure_temperature', 'va_temperature');
    this.registerCapability('measure_humidity', 'va_humidity');
    this.registerCapability('alarm_motion', 'pir_1');
    this.registerCapability('alarm_contact', 'doorcontact_state');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Tuya Sensor settings changed');
  }
}

module.exports = TuyaSensorDriver; 