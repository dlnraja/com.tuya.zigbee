'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class CurtainMotorTiltDriver extends ZigBeeDriver {

  async onInit() {
    this.log('CurtainMotorTiltDriver initialized');
  }

}

module.exports = CurtainMotorTiltDriver;
