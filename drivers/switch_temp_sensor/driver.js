'use strict';

const Homey = require('homey');

class SwitchTempSensorDriver extends Homey.Driver {
  async onInit() {
    this.log('Switch with Temperature Sensor Driver initialized');
    // v5.13.3: Flow card handlers
    const r=(i,fn)=>{try{this.homey.flow.getActionCard(i).registerRunListener(fn);}catch(e){this.log('[Flow]',i,e.message);}};
    r('switch_temp_sensor_turn_on',async({device})=>{await device.setCapabilityValue('onoff',true);return true;});
    r('switch_temp_sensor_turn_off',async({device})=>{await device.setCapabilityValue('onoff',false);return true;});
    r('switch_temp_sensor_toggle',async({device})=>{const v=device.getCapabilityValue('onoff');await device.setCapabilityValue('onoff',!v);return true;});
  }
}

module.exports = SwitchTempSensorDriver;
