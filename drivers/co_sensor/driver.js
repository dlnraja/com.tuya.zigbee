'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class CoSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('CoSensorDriver initialized');
  }

}

module.exports = CoSensorDriver;
