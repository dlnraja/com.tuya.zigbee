'use strict';

const { Driver } = require('homey');

class SmartHeaterControllerDriver extends Driver {
  async onInit() {
    this.log('Smart Heater Controller driver initialized');
    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => { try { this.homey.flow.getActionCard(id).registerRunListener(fn); } catch (e) { this.log('[Flow]', id, e.message); } };
    reg('smart_heater_controller_turn_on', async ({ device }) => { await device.triggerCapabilityListener('onoff', true); return true; });
    // v5.13.3: Condition handler
    try{this.homey.flow.getConditionCard('smart_heater_controller_is_on').registerRunListener(async({device})=>device.getCapabilityValue('onoff')===true);}catch(e){this.log('[Flow]',e.message);}
    try{this.homey.flow.getActionCard('smart_heater_controller_set_temperature').registerRunListener(async({device,temperature})=>{if(temperature!==undefined)await device.triggerCapabilityListener('target_temperature',temperature);return true;});}catch(e){this.log('[Flow]',e.message);}

    reg('smart_heater_controller_turn_off', async ({ device }) => { await device.triggerCapabilityListener('onoff', false); return true; });
    reg('smart_heater_controller_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device.triggerCapabilityListener('onoff', !v); return true; });

  }
}

module.exports = SmartHeaterControllerDriver;
