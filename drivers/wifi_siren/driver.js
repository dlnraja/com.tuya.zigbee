'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiSirenDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-SIREN-DRV] Driver initialized');
    // v5.13.3: Flow card handlers
    const r=(i,fn)=>{try{this.homey.flow.getActionCard(i).registerRunListener(fn);}catch(e){this.log('[Flow]',i,e.message);}};
    r('wifi_siren_activate',async({device})=>{await device.setCapabilityValue('onoff',true);return true;});
    r('wifi_siren_deactivate',async({device})=>{await device.setCapabilityValue('onoff',false);return true;});
  }
}

module.exports = WiFiSirenDriver;
