'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WirelessSceneController4buttonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WirelessSceneController4buttonDriver initialized');
  }
}

module.exports = WirelessSceneController4buttonDriver;
