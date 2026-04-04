'use strict';

const { Driver } = require('homey');

class EnergyMeter3phaseDriver extends Driver {
  async onInit() {
    this.log('3-Phase Energy Meter driver initialized');
    // v5.13.3: Flow card handlers
    try{(() => { try { return this.homey.flow.getActionCard('energy_meter_3phase_reset_meter'); } catch(e) { return null; } })()?.registerRunListener(async({device})=>{if(typeof device.resetMeter==='function')await device.resetMeter();return true;});}catch(e){this.log('[Flow]',e.message);}
  }
}

module.exports = EnergyMeter3phaseDriver;
