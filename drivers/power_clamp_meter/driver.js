'use strict';

const { Driver } = require('homey');

class PowerClampMeterDriver extends Driver {
  async onInit() {
    this.log('Power Clamp Meter driver initialized');
    // v5.13.3: Flow card handlers
    try{this.homey.flow.getActionCard('power_clamp_meter_reset_meter').registerRunListener(async({device})=>{if(typeof device.resetMeter==='function')await device.resetMeter();return true;});}catch(e){this.log('[Flow]',e.message);}
  }
}

module.exports = PowerClampMeterDriver;
