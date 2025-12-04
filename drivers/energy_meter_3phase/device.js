'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

class EnergyMeter3phaseDevice extends AutoAdaptiveDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Energy Meter 3-Phase initialized');
  }
}

module.exports = EnergyMeter3phaseDevice;
