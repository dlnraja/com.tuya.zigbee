'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class CoversDriver extends ZigBeeDriver {

  onInit() {
    this.log('covers driver initialized');
    super.onInit();
  }

}

module.exports = CoversDriver;
