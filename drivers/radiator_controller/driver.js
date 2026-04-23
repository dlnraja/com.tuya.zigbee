'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * RadiatorControllerDriver - v5.6.0
 */
class RadiatorControllerDriver extends ZigBeeDriver {
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
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('Radiator Controller Driver initialized');
    
    // Actions are registered in device.js for radiator-specific logic
  }
}

module.exports = RadiatorControllerDriver;
