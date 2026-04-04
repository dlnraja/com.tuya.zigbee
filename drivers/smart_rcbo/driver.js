'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartRcboDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartRcboDriver initialized');
    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => { try { this.homey.flow.getActionCard(id).registerRunListener(fn); } catch (e) { this.log('[Flow]', id, e.message); } };
    reg('smart_rcbo_turn_on', async ({ device }) => { await device.triggerCapabilityListener('onoff', true); return true; });
    // v5.13.3: Condition handler
    try{(() => { try { return this.homey.flow.getConditionCard('smart_rcbo_is_on'); } catch(e) { return null; } })()?.registerRunListener(async({device})=>device.getCapabilityValue('onoff')===true);}catch(e){this.log('[Flow]',e.message);}

    reg('smart_rcbo_turn_off', async ({ device }) => { await device.triggerCapabilityListener('onoff', false); return true; });
    reg('smart_rcbo_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device.triggerCapabilityListener('onoff', !v); return true; });

  }

}

module.exports = SmartRcboDriver;
