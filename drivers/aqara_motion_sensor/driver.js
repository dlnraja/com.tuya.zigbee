'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AqaraMotionSensorDriver extends ZigBeeDriver {

  onInit() {
    this.log('aqara_motion_sensor driver initialized');
    super.onInit();
  }

}

module.exports = AqaraMotionSensorDriver;
