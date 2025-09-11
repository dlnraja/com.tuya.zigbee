'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaSensorsTs0601MotionDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('tuya_sensors-ts0601_motion device initialized');
    
    this.registerCapability('alarm_motion', 'msOccupancySensing');
    this.registerCapability('measure_battery', 'genPowerCfg');
    
    await super.onNodeInit();
  }

  
  onMsOccupancySensingAttributeReport(report) {
    const motion = report.occupancy === 1;
    this.setCapabilityValue('alarm_motion', motion);
    this.log('Motion detected:', motion);
  }
}

module.exports = TuyaSensorsTs0601MotionDevice;
