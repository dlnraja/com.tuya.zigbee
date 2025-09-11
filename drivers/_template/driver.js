'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TemplateDriver extends ZigBeeDriver {

  onInit() {
    this.log('_template driver initialized');
    super.onInit();
  }

}

module.exports = TemplateDriver;
