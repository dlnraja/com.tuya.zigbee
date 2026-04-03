'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiThermostatDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-THERMOSTAT-DRV] Driver initialized');
  }
}

module.exports = WiFiThermostatDriver;
