'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaRadarSensorDriver extends ZigBeeDriver {

  onInit() {
    this.log('tuya_radar_sensor driver initialized');
    super.onInit();
  }

}

module.exports = TuyaRadarSensorDriver;
