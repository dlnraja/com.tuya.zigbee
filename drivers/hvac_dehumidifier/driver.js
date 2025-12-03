'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class HvacDehumidifierDriver extends ZigBeeDriver {

  async onInit() {
    this.log('HvacDehumidifierDriver initialized');
  }

}

module.exports = HvacDehumidifierDriver;
