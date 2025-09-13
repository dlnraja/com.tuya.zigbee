'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TemplateDriverDriver extends ZigBeeDriver {

  onInit() {
    this.log('template_driver driver initialized');
    super.onInit();
  }

}

module.exports = TemplateDriverDriver;
