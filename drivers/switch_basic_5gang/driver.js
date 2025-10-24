'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Switch5gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Switch5gangDriver initialized');
  }
}

module.exports = Switch5gangDriver;
