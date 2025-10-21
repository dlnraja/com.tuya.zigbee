'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class OsramBulbRgbwAcDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = OsramBulbRgbwAcDevice;
