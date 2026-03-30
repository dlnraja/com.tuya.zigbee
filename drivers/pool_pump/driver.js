'use strict';

const { Driver } = require('homey');

class PoolPumpDriver extends Driver {
  async onInit() {
    this.log('Pool Pump driver initialized');
    // v5.13.3: Flow card handlers
    const r=(i,fn)=>{try{this.homey.flow.getActionCard(i).registerRunListener(fn);}catch(e){this.log('[Flow]',i,e.message);}};
    r('pool_pump_turn_on',async({device})=>{await device.setCapabilityValue('onoff',true);return true;});
    r('pool_pump_turn_off',async({device})=>{await device.setCapabilityValue('onoff',false);return true;});
    r('pool_pump_toggle',async({device})=>{const v=device.getCapabilityValue('onoff');await device.setCapabilityValue('onoff',!v);return true;});
  }
}

module.exports = PoolPumpDriver;
