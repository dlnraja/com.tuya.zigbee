'use strict';

const { Driver } = require('homey');

class GasSensorDriver extends Driver {
  
  async onInit() {
    this.log('Gas Sensor TS0601 driver initialized');
  }

  async onPair(session) {
    this.log('Pairing started for Gas Sensor TS0601');
  }
}

module.exports = GasSensorDriver;
