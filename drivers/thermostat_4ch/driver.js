'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Thermostat4chDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Thermostat4chDriver initialized');
    // v5.13.3: Register flow card action handlers
    const reg=(id,fn)=>{try{this.homey.flow.getActionCard(id).registerRunListener(fn);}catch(e){this.log('[Flow]',id,e.message);}};
    reg('thermostat_4ch_turn_on',async({device})=>{await device.setCapabilityValue('onoff',true);return true;});
    reg('thermostat_4ch_turn_off',async({device})=>{await device.setCapabilityValue('onoff',false);return true;});
    reg('thermostat_4ch_toggle',async({device})=>{const v=device.getCapabilityValue('onoff');await device.setCapabilityValue('onoff',!v);return true;});
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
