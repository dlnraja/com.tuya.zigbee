'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartCurtainMotorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartCurtainMotorDriver initialized');
  }
}

module.exports = ZemismartCurtainMotorDriver;
