'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Switch2gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Switch2gangDriver initialized');
  }
}

module.exports = Switch2gangDriver;
