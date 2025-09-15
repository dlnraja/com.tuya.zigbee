'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TestLightDevice extends ZigBeeDevice {
  async onNodeInit() {
    this.registerCapability('onoff', 'genOnOff');
    await super.onNodeInit();
  }
}

module.exports = TestLightDevice;
