'use strict';

const { Driver } = require('homey');

class SmartHeaterControllerDriver extends Driver {
  async onInit() {
    this.log('Smart Heater Controller driver initialized');
  }
}

module.exports = SmartHeaterControllerDriver;
