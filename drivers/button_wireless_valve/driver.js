'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

/**
 * v5.5.533: Button 2-Gang Driver - Added await super.onInit()
 * v5.5.114: Original
 */
class ButtonWireless2GangDriver extends ZigBeeDriver {
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
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

     // v5.5.533: SDK3 CRITICAL
    this.log('ButtonWireless2GangDriver v5.5.533 initialized');
    registerButtonFlowCards(this, 'button_wireless_2', 2);
  
  
  
  
  
  
  
  }
}

module.exports = ButtonWireless2GangDriver;
