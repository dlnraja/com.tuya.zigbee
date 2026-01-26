'use strict';

const { Driver } = require('homey');

class PetFeederDriver extends Driver {
  async onInit() {
    this.log('Pet Feeder driver initialized');
  }
}

module.exports = PetFeederDriver;
