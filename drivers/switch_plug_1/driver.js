'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchPlug1Driver extends ZigBeeDriver {

  async onInit() {
    this.log('SwitchPlug1Driver initialized');
    // v5.13.3: Flow card handlers
    const r=(i,fn)=>{try{this.homey.flow.getActionCard(i).registerRunListener(fn);}catch(e){this.log('[Flow]',i,e.message);}};
    r('switch_plug_1_turn_on',async({device})=>{await device.triggerCapabilityListener('onoff',true);return true;});
    r('switch_plug_1_turn_off',async({device})=>{await device.triggerCapabilityListener('onoff',false);return true;});
    r('switch_plug_1_toggle',async({device})=>{const v=device.getCapabilityValue('onoff');await device.triggerCapabilityListener('onoff',!v);return true;});
  }

}

module.exports = SwitchPlug1Driver;
