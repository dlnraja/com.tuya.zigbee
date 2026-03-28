'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ValveSingleDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ValveSingleDriver initialized');
    // v5.13.3: Register flow card action handlers
    const reg=(id,fn)=>{try{this.homey.flow.getActionCard(id).registerRunListener(fn)}catch(e){this.log('[Flow]',id,e.message)}};
    reg('valve_single_turn_on',async({device})=>{await device.setCapabilityValue('onoff',true);return true});
    reg('valve_single_turn_off',async({device})=>{await device.setCapabilityValue('onoff',false);return true});
    reg('valve_single_toggle',async({device})=>{const v=device.getCapabilityValue('onoff');await device.setCapabilityValue('onoff',!v);return true});

  }

}

module.exports = ValveSingleDriver;
