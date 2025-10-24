'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class CurtainMotorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('CurtainMotorDriver initialized');
  }
}

module.exports = CurtainMotorDriver;
