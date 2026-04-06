'use strict';

const { Driver } = require('homey');

class PowerMeterDriver extends Driver {
  async onInit() {
    this.log('Power Meter driver initialized');
    // v5.13.3: Flow card handlers
    try{(() => { try { return this.homey.flow.getDeviceActionCard('power_meter_reset_meter'); } catch(e) { return null; } })()?.registerRunListener(async({device})=>{if(typeof device.resetMeter==='function')await device.resetMeter();return true;});}catch(e){this.log('[Flow]',e.message);}
  }
}

module.exports = PowerMeterDriver;
