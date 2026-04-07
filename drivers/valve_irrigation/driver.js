'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ValveIrrigationDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ValveIrrigationDriver initialized');
    // v5.13.3: Register flow card action handlers
    const reg=(id,fn)=>{try{this.homey.flow.getDeviceActionCard(id).registerRunListener(fn);}catch(e){this.log('[Flow]',id,e.message);}};
    reg('valve_irrigation_turn_on',async({device})=>{await device.triggerCapabilityListener('onoff',true);return true;});
    reg('valve_irrigation_turn_off',async({device})=>{await device.triggerCapabilityListener('onoff',false);return true;});
    reg('valve_irrigation_toggle',async({device})=>{const v=device.getCapabilityValue('onoff');await device.triggerCapabilityListener('onoff',!v);return true;});

  }

}

module.exports = ValveIrrigationDriver;
