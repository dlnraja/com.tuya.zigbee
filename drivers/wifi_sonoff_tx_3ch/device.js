'use strict';
const { HomeyDevice } = require('../../lib/devices/HomeyDevice');

class WifiSonoffTx3ChDevice extends HomeyDevice {
  async onInit() {
    await super.onInit();
    this.log('WiFi Sonoff TX 3-Ch v5.9.12 Ready');

    for (let i = 0; i < 3; i++) {
      const capability = i === 0 ? 'onoff' : `onoff.${i + 1}`;
      this.registerCapabilityListener(capability, async (v) => {
        if (this._client) await this._client.setSwitch(v, i);
      });
    }
  }
}

module.exports = WifiSonoffTx3ChDevice;
