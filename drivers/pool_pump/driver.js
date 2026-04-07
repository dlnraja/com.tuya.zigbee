'use strict';

const { Driver } = require('homey');

class PoolPumpDriver extends Driver {
  async onInit() {
    this.log('Pool Pump driver initialized');
    // v5.13.3: Flow card handlers
    const r=(i,fn)=>{try{this.homey.flow.getDeviceActionCard(i).registerRunListener(fn);}catch(e){this.log('[Flow]',i,e.message);}};
    r('pool_pump_turn_on',async({device})=>{await device.triggerCapabilityListener('onoff',true);return true;});
    r('pool_pump_turn_off',async({device})=>{await device.triggerCapabilityListener('onoff',false);return true;});
    r('pool_pump_toggle',async({device})=>{const v=device.getCapabilityValue('onoff');await device.triggerCapabilityListener('onoff',!v);return true;});
  }
}

module.exports = PoolPumpDriver;
