'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ValveSingleDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ValveSingleDriver initialized');
  }

}

module.exports = ValveSingleDriver;
