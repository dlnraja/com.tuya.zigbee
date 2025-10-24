'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZigbeeGatewayHubDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZigbeeGatewayHubDriver initialized');
  }
}

module.exports = ZigbeeGatewayHubDriver;
