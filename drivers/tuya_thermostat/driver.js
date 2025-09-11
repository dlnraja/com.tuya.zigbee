'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaThermostatDriver extends ZigBeeDriver {

  onInit() {
    this.log('tuya_thermostat driver initialized');
    super.onInit();
  }

}

module.exports = TuyaThermostatDriver;
