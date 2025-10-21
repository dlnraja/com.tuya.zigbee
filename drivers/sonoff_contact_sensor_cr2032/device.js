'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SonoffContactSensorCr2032Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = SonoffContactSensorCr2032Device;
