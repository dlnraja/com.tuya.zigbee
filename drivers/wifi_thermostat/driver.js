'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiThermostatDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-THERMOSTAT-DRV] Driver initialized');
    // v5.13.3: Flow card handlers
    try{(() => { try { return this.homey.flow.getActionCard('wifi_thermostat_set_temp'); } catch(e) { return null; } })()?.registerRunListener(async({device,...args})=>{if(args.temperature!==undefined)await device.triggerCapabilityListener('target_temperature',args.temperature);return true;});}catch(e){this.log('[Flow]',e.message);}
  }
}

module.exports = WiFiThermostatDriver;
