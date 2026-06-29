'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

/**
 * ButtonWireless4 Driver - v7.5.52
 * Provides crash-prevention device ID lookup + safe init
 */
class ButtonWireless4Driver extends BaseZigBeeDriver {
async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    const driverId = this.id || this.manifest?.id || 'button_wireless_4';
    this.log(`Button Wireless 4 Driver initialized [v7.5.52] for ${driverId}`);
    registerButtonFlowCards(this, driverId, 4);
  }
}

module.exports = ButtonWireless4Driver;
