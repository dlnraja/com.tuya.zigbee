'use strict';

const { Driver } = require('homey');

class ZigbeeRepeaterDriver extends Driver {
  async onInit() {
    this.log('Zigbee Repeater driver initialized');
  }
}

module.exports = ZigbeeRepeaterDriver;
