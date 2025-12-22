'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LEDControllerDimmableDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LED Controller Dimmable Driver initialized');
    this.log('Fixes Issue #83: WoodUpp/Tuya 24V LED Driver');
  }

}

module.exports = LEDControllerDimmableDriver;
