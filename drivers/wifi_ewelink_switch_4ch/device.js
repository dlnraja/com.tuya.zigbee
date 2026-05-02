'use strict';
const { HomeyDevice } = require('../../lib/devices/HomeyDevice');

class WifiEwelinkSwitch4ChDevice extends HomeyDevice {
  async onInit() {
    await super.onInit();
    this.log('WiFi eWeLink 4-Ch Switch v5.9.12 Ready');

    for (let i = 0; i < 4; i++) {
      const capability = i === 0 ? 'onoff' : `onoff.${i + 1}`;
      this.registerCapabilityListener(capability, async (v) => {
        if (this._client) await this._client.setSwitch(v, i);
      });
    }
  }
}

module.exports = WifiEwelinkSwitch4ChDevice;
