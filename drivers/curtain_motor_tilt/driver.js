'use strict';

const Homey = require('homey');

class CurtainMotorTiltDriver extends Homey.Driver {
  async onInit() {
    this.log('Curtain Motor with Tilt Driver initialized');
  }
}

module.exports = CurtainMotorTiltDriver;
