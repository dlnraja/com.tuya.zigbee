'use strict';
const { HomeyDevice } = require('../../lib/devices/HomeyDevice');

class WifiSonoffPowEliteDevice extends HomeyDevice {
  async onInit() {
    await super.onInit();
    this.log('WiFi Sonoff POW Elite v5.9.12 Ready');

    this.registerCapabilityListener('onoff', async (v) => {
      if (this._client) await this._client.setSwitch(v);
    });
  }
}

module.exports = WifiSonoffPowEliteDevice;
