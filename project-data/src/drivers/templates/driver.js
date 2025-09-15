'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TemplatesDriver extends ZigBeeDriver {

  onInit() {
    this.log('templates driver initialized');
    super.onInit();
  }

}

module.exports = TemplatesDriver;
