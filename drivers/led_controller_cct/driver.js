'use strict';

const Homey = require('homey');

class LedControllerCctDriver extends Homey.Driver {
  async onInit() {
    this.log('LED Controller CCT Driver initialized');
  }
}

module.exports = LedControllerCctDriver;
