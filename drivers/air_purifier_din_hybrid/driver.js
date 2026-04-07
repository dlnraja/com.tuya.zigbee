'use strict';

const { Driver } = require('homey');

class DinRailSwitchDriver extends Driver {
  async onInit() {
    this.log('Din Rail Switch driver initialized');
    // v5.13.3: Register flow card action handlers
    const reg=(id,fn)=>{try{this.homey.flow.getDeviceActionCard(id).registerRunListener(fn);}catch(e){this.log('[Flow]',id,e.message);}};
    reg('din_rail_switch_turn_on',async({device})=>{await device.triggerCapabilityListener('onoff',true);return true;});
    reg('din_rail_switch_turn_off',async({device})=>{await device.triggerCapabilityListener('onoff',false);return true;});
    reg('din_rail_switch_toggle',async({device})=>{const v=device.getCapabilityValue('onoff');await device.triggerCapabilityListener('onoff',!v);return true;});

  }
}

module.exports = DinRailSwitchDriver;
