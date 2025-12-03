'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class HvacAirConditionerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('HvacAirConditionerDriver initialized');
  }

}

module.exports = HvacAirConditionerDriver;
