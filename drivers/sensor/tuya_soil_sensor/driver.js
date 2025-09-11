'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaSoilSensorDriver extends ZigBeeDriver {

  onInit() {
    this.log('tuya_soil_sensor driver initialized');
    super.onInit();
  }

}

module.exports = TuyaSoilSensorDriver;
