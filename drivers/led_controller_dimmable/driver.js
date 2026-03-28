'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LEDControllerDimmableDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LED Controller Dimmable Driver initialized');
    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => { try { this.homey.flow.getActionCard(id).registerRunListener(fn); } catch (e) { this.log("[Flow]", id, e.message); } };
    reg('led_controller_dimmable_turn_on', async ({ device }) => { await device.setCapabilityValue('onoff', true); return true; });
    // v5.13.3: Condition handler
    try{this.homey.flow.getConditionCard('led_controller_dimmable_is_on').registerRunListener(async({device})=>device.getCapabilityValue('onoff')===true)}catch(e){this.log('[Flow]',e.message)}
    try{this.homey.flow.getActionCard('led_controller_dimmable_set_brightness').registerRunListener(async({device,brightness})=>{if(brightness!==undefined)await device.setCapabilityValue('dim',brightness);return true})}catch(e){this.log('[Flow]',e.message)}

    reg('led_controller_dimmable_turn_off', async ({ device }) => { await device.setCapabilityValue('onoff', false); return true; });
    reg('led_controller_dimmable_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device.setCapabilityValue('onoff', !v); return true; });

    this.log('Fixes Issue #83: WoodUpp/Tuya 24V LED Driver');
  }

}

module.exports = LEDControllerDimmableDriver;
