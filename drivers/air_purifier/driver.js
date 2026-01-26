'use strict';

const { Driver } = require('homey');

class AirPurifierDriver extends Driver {
  async onInit() {
    this.log('Air Purifier driver initialized');
  }
}

module.exports = AirPurifierDriver;
