'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ButtonWireless2GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ButtonWireless2GangDriver initialized');
    
    // Flow cards are automatically registered from driver.flow.compose.json in SDK3
    // No manual registration needed
  }
}

module.exports = ButtonWireless2GangDriver;