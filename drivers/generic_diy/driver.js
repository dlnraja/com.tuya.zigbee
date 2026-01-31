'use strict';

const { Driver } = require('homey');

class GenericDIYDriver extends Driver {

  async onInit() {
    this.log('Generic DIY Zigbee Driver initialized');
  }

  async onPairListDevices() {
    return [];
  }

}

module.exports = GenericDIYDriver;
