'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartHeaterDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartHeaterDriver initialized');
    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => { try { this.homey.flow.getActionCard(id).registerRunListener(fn); } catch (e) { this.log('[Flow]', id, e.message); } };
    reg('smart_heater_turn_on', async ({ device }) => { await device.setCapabilityValue('onoff', true); return true; });
    // v5.13.3: Condition handler
    try{this.homey.flow.getConditionCard('smart_heater_is_on').registerRunListener(async({device})=>device.getCapabilityValue('onoff')===true);}catch(e){this.log('[Flow]',e.message);}
    try{this.homey.flow.getActionCard('smart_heater_set_temperature').registerRunListener(async({device,temperature})=>{if(temperature!==undefined)await device.setCapabilityValue('target_temperature',temperature);return true;});}catch(e){this.log('[Flow]',e.message);}

    reg('smart_heater_turn_off', async ({ device }) => { await device.setCapabilityValue('onoff', false); return true; });
    reg('smart_heater_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device.setCapabilityValue('onoff', !v); return true; });

  }

}

module.exports = SmartHeaterDriver;
