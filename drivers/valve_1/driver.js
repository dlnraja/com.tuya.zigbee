'use strict';

const Homey = require('homey');

class Valve1Driver extends Homey.Driver {
  async onInit() {
    this.log('Smart Valve 1-Way Driver initialized');
  }
}

module.exports = Valve1Driver;
