'use strict';
const { HomeyDevice } = require('../../lib/devices/HomeyDevice');

class WifiEwelinkDimmerDevice extends HomeyDevice {
  async onInit() {
    await super.onInit();
    this.log('WiFi eWeLink Dimmer v5.9.12 Ready');

    this.registerCapabilityListener('onoff', async (v) => {
      if (this._client) await this._client.setDimmer(this._lastBrightness || 100, v);
    });
  }
}

module.exports = WifiEwelinkDimmerDevice;
