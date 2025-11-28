'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AqaraPresenceFP1Driver extends ZigBeeDriver {

  onInit() {
    this.log('Aqara Presence Sensor FP1 driver initialized');
  }

}

module.exports = AqaraPresenceFP1Driver;
