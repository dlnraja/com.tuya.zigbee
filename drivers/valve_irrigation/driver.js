'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ValveIrrigationDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ValveIrrigationDriver initialized');
  }

}

module.exports = ValveIrrigationDriver;
