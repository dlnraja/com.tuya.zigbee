'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiSwitchDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-SWITCH-DRV] Driver initialized');
    // v5.13.3: Flow card handlers
    try{this.homey.flow.getActionCard('wifi_switch_toggle').registerRunListener(async({device})=>{const v=device.getCapabilityValue('onoff');await device.setCapabilityValue('onoff',!v);return true})}catch(e){this.log('[Flow]',e.message)}
  }
}

module.exports = WiFiSwitchDriver;
