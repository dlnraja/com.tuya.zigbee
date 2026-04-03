'use strict';

const { Driver } = require('homey');

class HumidifierDriver extends Driver {
  async onInit() {
    this.log('Humidifier driver initialized');
  }
}

module.exports = HumidifierDriver;
