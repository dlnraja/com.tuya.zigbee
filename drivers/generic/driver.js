'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class GenericDriver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('🚀 Generic driver init');
  }
}

module.exports = GenericDriver;
