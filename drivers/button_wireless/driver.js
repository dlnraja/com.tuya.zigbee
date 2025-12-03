'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ButtonWirelessDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ButtonWirelessDriver initialized');
  }

}

module.exports = ButtonWirelessDriver;
