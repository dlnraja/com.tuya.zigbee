'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartWirelessSceneController4buttonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartWirelessSceneController4buttonDriver initialized');
  }
}

module.exports = ZemismartWirelessSceneController4buttonDriver;
