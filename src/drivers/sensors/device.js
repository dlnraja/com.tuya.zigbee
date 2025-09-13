'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SensorsDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('sensors device initialized');
    
    this.registerCapability('alarm_motion', 'msOccupancySensing');
    this.registerCapability('measure_battery', 'genPowerCfg');
    
    await super.onNodeInit();
  }

  
  // Device-specific methods can be added here
}

module.exports = SensorsDevice;
