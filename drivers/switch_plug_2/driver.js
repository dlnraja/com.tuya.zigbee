'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchPlug2Driver extends ZigBeeDriver {

  async onInit() {
    this.log('SwitchPlug2Driver initialized');
    // v5.13.3: Flow card handlers
    const r=(i,fn)=>{try{this.homey.flow.getDeviceActionCard(i).registerRunListener(fn);}catch(e){this.log('[Flow]',i,e.message);}};
    r('switch_plug_2_turn_on',async({device})=>{await device.triggerCapabilityListener('onoff',true);return true;});
    r('switch_plug_2_turn_off',async({device})=>{await device.triggerCapabilityListener('onoff',false);return true;});
    r('switch_plug_2_toggle',async({device})=>{const v=device.getCapabilityValue('onoff');await device.triggerCapabilityListener('onoff',!v);return true;});
  }

}

module.exports = SwitchPlug2Driver;
