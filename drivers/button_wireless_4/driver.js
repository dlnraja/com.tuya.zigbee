'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');

/**
 * ButtonWireless4 Driver - v7.5.52
 * Provides crash-prevention device ID lookup + safe init
 */
class ButtonWireless4Driver extends BaseZigBeeDriver {
async onInit() {
    await super.onInit();
    this.log('Button Wireless 4 Driver initialized [v7.5.52]');
  }
}

module.exports = ButtonWireless4Driver;
