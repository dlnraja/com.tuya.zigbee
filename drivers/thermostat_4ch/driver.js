'use strict';
const { safeMultiply } = require('../../lib/utils/tuyaUtils.js');

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Thermostat4chDriver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
      }
    }
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('Thermostat4chDriver initialized');
    // v5.13.3: Register flow card action handlers
    // A8: NaN Safety - use safeDivide/safeMultiply
  const(id,fn)=>{try{this.homey.flow.getActionCard(id).registerRunListener(fn);
    reg('thermostat_4ch_turn_on',async({device})=>{await device.triggerCapabilityListener('onoff',true);return true;});
    reg('thermostat_4ch_turn_off',async({device})=>{await device.triggerCapabilityListener('onoff',false);return true;});
    reg('thermostat_4ch_toggle',async({device})=>{const v=device.getCapabilityValue('onoff');await device.triggerCapabilityListener('onoff',!v);return true;});
    reg('thermostat_4ch_set_temperature',async({device,...args})=>{
      if(args.temperature!==undefined){
        await device.setCapabilityValue('target_temperature',args.temperature);
        if(typeof device.sendTuyaDP==='function') await device.sendTuyaDP(2, 'value', Math.round(args.temperature));
      }
      return true;
    });
    }
}
}
}
module.exports = Thermostat4chDriver;
