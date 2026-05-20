'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');

/**
 * ButtonWireless3 Driver - v7.5.52
 * Provides crash-prevention device ID lookup + safe init
 */
class ButtonWireless3Driver extends BaseZigBeeDriver {
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    await super.onInit();
    this.log('Button Wireless 3 Driver initialized [v7.5.52]');
  }
}

module.exports = ButtonWireless3Driver;
