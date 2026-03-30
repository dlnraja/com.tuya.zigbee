'use strict';

const { Driver } = require('homey');

class HumidifierDriver extends Driver {
  async onInit() {
    this.log('Humidifier driver initialized');
    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => { try { this.homey.flow.getActionCard(id).registerRunListener(fn); } catch (e) { this.log('[Flow]', id, e.message); } };
    reg('humidifier_turn_on', async ({ device }) => { await device.setCapabilityValue('onoff', true); return true; });
    // v5.13.3: Condition handler
    try{this.homey.flow.getConditionCard('humidifier_is_on').registerRunListener(async({device})=>device.getCapabilityValue('onoff')===true);}catch(e){this.log('[Flow]',e.message);}
    try{this.homey.flow.getActionCard('humidifier_set_brightness').registerRunListener(async({device,brightness})=>{if(brightness!==undefined)await device.setCapabilityValue('dim',brightness);return true;});}catch(e){this.log('[Flow]',e.message);}

    reg('humidifier_turn_off', async ({ device }) => { await device.setCapabilityValue('onoff', false); return true; });
    reg('humidifier_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device.setCapabilityValue('onoff', !v); return true; });

  }
}

module.exports = HumidifierDriver;
