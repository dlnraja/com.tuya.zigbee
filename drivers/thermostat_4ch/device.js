'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

class Thermostat4chDevice extends BaseHybridDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Thermostat 4-Channel initialized');
  }
}

module.exports = Thermostat4chDevice;
