'use strict';

const { Driver } = require('homey');

class GenericDriver extends Driver {
  async onInit() {
    this.log('Driver has been initialized');
  }

  async onPairListDevices() {
    return [];
  }
}

module.exports = GenericDriver;
