'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class models_tuya_gas_320_plug_standardDriver extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique du driver
  }
}

module.exports = models_tuya_gas_320_plug_standardDriver;