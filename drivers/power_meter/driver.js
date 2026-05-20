'use strict';

const { Driver } = require('homey');

class PowerMeterDriver extends Driver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;

    this.log('Power Meter driver initialized');
    // v5.13.3: Flow card handlers

  
  
  
  
  
  
  
  }
}

module.exports = PowerMeterDriver;
