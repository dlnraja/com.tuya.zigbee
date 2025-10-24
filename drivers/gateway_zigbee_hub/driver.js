'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class NousZigbeeGatewayHubDriver extends ZigBeeDriver {

  async onInit() {
    this.log('NousZigbeeGatewayHubDriver initialized');
  }
}

module.exports = NousZigbeeGatewayHubDriver;
