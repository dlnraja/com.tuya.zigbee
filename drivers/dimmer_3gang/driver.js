'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.534: FIXED to use ZigBeeDriver + await super.onInit()
 */
class Dimmer3GangDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit(); // v5.5.534: SDK3 CRITICAL
    this.log('3-Gang Dimmer Driver v5.5.534 initialized');
    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => { try { this.homey.flow.getActionCard(id).registerRunListener(fn); } catch (e) { this.log('[Flow]', id, e.message); } };
    reg('dimmer_3gang_turn_on', async ({ device }) => { await device.triggerCapabilityListener('onoff', true); return true; });
    // v5.13.3: Condition handler
    try{this.homey.flow.getConditionCard('dimmer_3gang_is_on').registerRunListener(async({device})=>device.getCapabilityValue('onoff')===true);}catch(e){this.log('[Flow]',e.message);}
    try{this.homey.flow.getActionCard('dimmer_3gang_set_brightness').registerRunListener(async({device,brightness})=>{if(brightness!==undefined)await device.triggerCapabilityListener('dim',brightness);return true;});}catch(e){this.log('[Flow]',e.message);}

    reg('dimmer_3gang_turn_off', async ({ device }) => { await device.triggerCapabilityListener('onoff', false); return true; });
    reg('dimmer_3gang_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device.triggerCapabilityListener('onoff', !v); return true; });

  }
}

module.exports = Dimmer3GangDriver;
