'use strict';

const Homey = require('homey');

class SmartHeaterDriver extends Homey.Driver {
  async onInit() {
    this.log('Smart Heater Driver initialized');
  }
}

module.exports = SmartHeaterDriver;
