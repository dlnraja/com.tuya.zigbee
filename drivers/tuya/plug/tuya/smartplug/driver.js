'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartplugDriver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('smartplug driver initialized');
  }
}

module.exports = SmartplugDriver;