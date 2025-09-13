'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaSensorsTs0601MotionDriver extends ZigBeeDriver {

  onInit() {
    this.log('tuya_sensors-ts0601_motion driver initialized');
    super.onInit();
  }

}

module.exports = TuyaSensorsTs0601MotionDriver;
