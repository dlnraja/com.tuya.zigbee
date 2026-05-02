'use strict';
const { HomeyDevice } = require('../../lib/devices/HomeyDevice');

class WifiEwelinkPowDevice extends HomeyDevice {
  async onInit() {
    await super.onInit();
    this.log('WiFi eWeLink POW v5.9.12 Ready');

    this.registerCapabilityListener('onoff', async (v) => {
      if (this._client) await this._client.setSwitch(v);
    });
  }
}

module.exports = WifiEwelinkPowDevice;
