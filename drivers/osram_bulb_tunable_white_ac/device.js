'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class OsramBulbTunableWhiteAcDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = OsramBulbTunableWhiteAcDevice;
