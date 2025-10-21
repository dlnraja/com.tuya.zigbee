'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class OsramBulbWhiteAcDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = OsramBulbWhiteAcDevice;
