'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

/**
 * ButtonWireless3 Driver - v7.5.52
 * Provides crash-prevention device ID lookup + safe init
 */
class ButtonWireless3Driver extends BaseZigBeeDriver {
async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('Button Wireless 3 Driver initialized [v7.5.52]');
    registerButtonFlowCards(this, 'button_wireless_3', 3);
  }
}

module.exports = ButtonWireless3Driver;
