'use strict';

const Homey = require('homey');

class Valve4Driver extends Homey.Driver {
  async onInit() {
    this.log('Smart Valve 4-Way Driver initialized');
  }
}

module.exports = Valve4Driver;
