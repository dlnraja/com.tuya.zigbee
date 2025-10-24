'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Pm25DetectorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Pm25DetectorDriver initialized');
  }
}

module.exports = Pm25DetectorDriver;
