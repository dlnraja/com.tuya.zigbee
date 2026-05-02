'use strict';
const { HomeyDevice } = require('../../lib/devices/HomeyDevice');

class WifiEwelinkSwitchDevice extends HomeyDevice {
  async onInit() {
    await super.onInit();
    this.log('WiFi eWeLink Switch v5.9.12 Ready');

    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (v) => {
        if (this._client) await this._client.setSwitch(v);
      });
    }
  }
}

module.exports = WifiEwelinkSwitchDevice;
