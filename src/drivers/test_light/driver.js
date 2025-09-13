'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TestLightDriver extends ZigBeeDriver {
  onInit() {
    super.onInit();
  }
}

module.exports = TestLightDriver;
