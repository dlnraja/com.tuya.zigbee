'use strict';

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
    this.log('Thermostat4chDriver initialized');
    // v5.13.3: Register flow card action handlers
    const reg=(id,fn)=>{try{(() => { try { return this.homey.flow.getDeviceActionCard(id); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })().registerRunListener(fn);}catch(e){this.log('[Flow]',id,e.message);}};
    reg('thermostat_4ch_turn_on',async({device})=>{await device.triggerCapabilityListener('onoff',true);return true;});
    reg('thermostat_4ch_turn_off',async({device})=>{await device.triggerCapabilityListener('onoff',false);return true;});
    reg('thermostat_4ch_toggle',async({device})=>{const v=device.getCapabilityValue('onoff');await device.triggerCapabilityListener('onoff',!v);return true;});
    reg('thermostat_4ch_set_temperature',async({device,...args})=>{
      if(args.temperature!==undefined){
        await device.setCapabilityValue('target_temperature',args.temperature);
        if(typeof device.sendTuyaDP==='function') await device.sendTuyaDP(2,'value',Math.round(args.temperature*10));
      }
      return true;
    });
  }

}

module.exports = Thermostat4chDriver;
