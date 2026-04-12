'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class UniversalFallbackDriver extends ZigBeeDriver {
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

    
    this.log('[UNIVERSAL-DRIVER] ✅ Universal Fallback Driver initialized');
    this.log('[UNIVERSAL-DRIVER] 🔧 Catches unknown Tuya/Zigbee devices');
  
  
  
  }

  async onPairListDevices() {
    this.log('[UNIVERSAL-DRIVER] 🔍 Listing devices for pairing...');
    return [];
  }

}

module.exports = UniversalFallbackDriver;
