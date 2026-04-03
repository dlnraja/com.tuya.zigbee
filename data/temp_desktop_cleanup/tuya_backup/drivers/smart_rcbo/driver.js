'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartRcboDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartRcboDriver initialized');
  }

}

module.exports = SmartRcboDriver;
