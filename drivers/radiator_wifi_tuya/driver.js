'use strict';

const Homey = require('homey');

class RadiatorWifiTuyaDriver extends Homey.Driver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('WiFi Tuya Radiator Driver initialized');
  
  
  
  
  
  }

  async onPair(session) {
    this.log('Pairing started');
    
    session.setHandler('list_devices', async () => {
      // For WiFi devices, user must provide device details manually
      // In future: implement local network discovery
      return [];
    });
  }
}

module.exports = RadiatorWifiTuyaDriver;
