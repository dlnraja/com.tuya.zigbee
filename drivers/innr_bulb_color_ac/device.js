'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class InnrBulbColorAcDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = InnrBulbColorAcDevice;
