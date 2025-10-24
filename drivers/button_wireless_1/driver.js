'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Button1GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Button1GangDriver initialized');
    
    // Flow cards are automatically registered from driver.flow.compose.json in SDK3
    // No manual registration needed
  }
}

module.exports = Button1GangDriver;
