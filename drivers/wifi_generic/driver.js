'use strict';
const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');
class WiFiGenericDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-GENERIC-DRV] Generic WiFi driver initialized');
    // v5.13.3: Flow card handlers
    try{(() => { try { return this.homey.flow.getActionCard('wifi_generic_set_dp'); } catch(e) { return null; } })()?.registerRunListener(async({device,...args})=>{if(typeof device.sendDP==='function')await device.sendDP(args.dp,args.value);return true;});}catch(e){this.log('[Flow]',e.message);}
  }
}
module.exports = WiFiGenericDriver;
