'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ButtonWireless3GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ButtonWireless3GangDriver initialized');
    
    // Flow cards are automatically registered from driver.flow.compose.json in SDK3
    // No manual registration needed
  }
}

module.exports = ButtonWireless3GangDriver;