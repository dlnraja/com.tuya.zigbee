'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

class Thermostat4chDevice extends AutoAdaptiveDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Thermostat 4-Channel initialized');
  }
}

module.exports = Thermostat4chDevice;
