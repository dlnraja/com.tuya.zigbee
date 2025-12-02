'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

class EnergyMeter3phaseDevice extends BaseHybridDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Energy Meter 3-Phase initialized');
  }
}

module.exports = EnergyMeter3phaseDevice;
