'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.534: FIXED to use ZigBeeDriver + await super.onInit()
 */
class USBHubDualDriver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
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
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;

    // v5.5.534: SDK3 CRITICAL
    this.log('USB Hub Dual Driver v5.5.534 initialized');

    // v9.0.378: button flow cards (gate button-flow-routing)
    const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');
    registerButtonFlowCards(this, 'button_wireless_usb', 1);
  }
}
module.exports = USBHubDualDriver;
