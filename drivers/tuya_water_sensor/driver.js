'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaWaterSensorDriver extends ZigBeeDriver {

  onInit() {
    this.log('tuya_water_sensor driver initialized');
    super.onInit();
  }

}

module.exports = TuyaWaterSensorDriver;
