'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class InnrBulbWhiteAcDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = InnrBulbWhiteAcDevice;
