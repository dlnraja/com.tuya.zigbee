'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Switch1gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Switch1gangDriver initialized');
  }
}

module.exports = Switch1gangDriver;
