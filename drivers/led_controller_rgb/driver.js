'use strict';

const Homey = require('homey');

class LedControllerRgbDriver extends Homey.Driver {
  async onInit() {
    this.log('LED Controller RGB Driver initialized');
  }
}

module.exports = LedControllerRgbDriver;
