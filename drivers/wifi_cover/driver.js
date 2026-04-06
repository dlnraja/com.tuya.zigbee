'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiCoverDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-COVER-DRV] Driver initialized');
    // v5.13.3: Flow card handlers
    const r=(i,fn)=>{try{this.homey.flow.getActionCard(i).registerRunListener(fn);}catch(e){this.log('[Flow]',i,e.message);}};
    r('wifi_cover_open',async({device})=>{await device.triggerCapabilityListener('windowcoverings_state','up');return true;});
    r('wifi_cover_close',async({device})=>{await device.triggerCapabilityListener('windowcoverings_state','down');return true;});
    r('wifi_cover_stop',async({device})=>{await device.triggerCapabilityListener('windowcoverings_state','idle');return true;});
  }
}

module.exports = WiFiCoverDriver;
