'use strict';

const { Driver } = require('homey');

class SmartBreakerDriver extends Driver {
  async onInit() {
    this.log('Smart Breaker driver initialized');
    // v5.13.3: Register flow card action handlers
    const reg=(id,fn)=>{try{this.homey.flow.getActionCard(id).registerRunListener(fn);}catch(e){this.log('[Flow]',id,e.message);}};
    reg('smart_breaker_turn_on',async({device})=>{await device.triggerCapabilityListener('onoff',true);return true;});
    reg('smart_breaker_turn_off',async({device})=>{await device.triggerCapabilityListener('onoff',false);return true;});
    reg('smart_breaker_toggle',async({device})=>{const v=device.getCapabilityValue('onoff');await device.triggerCapabilityListener('onoff',!v);return true;});

  }
}

module.exports = SmartBreakerDriver;
