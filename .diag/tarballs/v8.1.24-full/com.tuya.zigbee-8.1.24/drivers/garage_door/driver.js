'use strict';

const { Driver } = require('homey');

class GarageDoorDriver extends Driver {
  async onInit() {
    this.log('Garage Door driver initialized');
  }
}

module.exports = GarageDoorDriver;
