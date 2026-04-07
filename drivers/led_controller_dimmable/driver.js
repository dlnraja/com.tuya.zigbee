'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LEDControllerDimmableDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LED Controller Dimmable Driver initialized');
    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => { try { this.homey.flow.getDeviceActionCard(id).registerRunListener(fn); } catch (e) { this.log('[Flow]', id, e.message); } };
    reg('led_controller_dimmable_turn_on', async ({ device }) => { await device.triggerCapabilityListener('onoff', true); return true; });
    // v5.13.3: Condition handler
    try{(() => { try { return this.homey.flow.getDeviceConditionCard('led_controller_dimmable_is_on'); } catch(e) { return null; } })()?.registerRunListener(async({device})=>device.getCapabilityValue('onoff')===true);}catch(e){this.log('[Flow]',e.message);}
    try{(() => { try { return this.homey.flow.getDeviceActionCard('led_controller_dimmable_set_brightness'); } catch(e) { return null; } })()?.registerRunListener(async({device,brightness})=>{if(brightness!==undefined)await device.triggerCapabilityListener('dim',brightness);return true;});}catch(e){this.log('[Flow]',e.message);}

    reg('led_controller_dimmable_turn_off', async ({ device }) => { await device.triggerCapabilityListener('onoff', false); return true; });
    reg('led_controller_dimmable_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device.triggerCapabilityListener('onoff', !v); return true; });

    this.log('Fixes Issue #83: WoodUpp/Tuya 24V LED Driver');
  }

}

module.exports = LEDControllerDimmableDriver;
