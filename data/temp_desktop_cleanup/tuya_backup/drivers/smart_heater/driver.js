'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartHeaterDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartHeaterDriver initialized');
  }

}

module.exports = SmartHeaterDriver;
