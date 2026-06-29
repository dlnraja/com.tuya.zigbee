'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

function resolveDriverId(driver) {
  return driver?.id || driver?.manifest?.id || 'button_wireless_4';
}

/**
 * ButtonWireless4 Driver - v7.5.52
 * Provides crash-prevention device ID lookup + safe init
 */
class ButtonWireless4Driver extends BaseZigBeeDriver {
  async onInit() {
    await super.onInit();
    const driverId = resolveDriverId(this);
    registerButtonFlowCards(this, driverId, 4);
    this.log(`Button Wireless 4 Driver initialized [flows:${driverId}]`);
  }
}

module.exports = ButtonWireless4Driver;
