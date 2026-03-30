'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LedControllerCctDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LedControllerCctDriver initialized');
    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => { try { this.homey.flow.getActionCard(id).registerRunListener(fn); } catch (e) { this.log('[Flow]', id, e.message); } };
    reg('led_controller_cct_turn_on', async ({ device }) => { await device.setCapabilityValue('onoff', true); return true; });
    // v5.13.3: Condition handler
    try{this.homey.flow.getConditionCard('led_controller_cct_is_on').registerRunListener(async({device})=>device.getCapabilityValue('onoff')===true);}catch(e){this.log('[Flow]',e.message);}
    try{this.homey.flow.getActionCard('led_controller_cct_set_brightness').registerRunListener(async({device,brightness})=>{if(brightness!==undefined)await device.setCapabilityValue('dim',brightness);return true;});}catch(e){this.log('[Flow]',e.message);}

    reg('led_controller_cct_turn_off', async ({ device }) => { await device.setCapabilityValue('onoff', false); return true; });
    reg('led_controller_cct_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device.setCapabilityValue('onoff', !v); return true; });

  }

}

module.exports = LedControllerCctDriver;
