'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ProtocolsContainerDriver extends ZigBeeDriver {

  onInit() {
    this.log('protocols_container driver initialized');
    super.onInit();
  }

}

module.exports = ProtocolsContainerDriver;
