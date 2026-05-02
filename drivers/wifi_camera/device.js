'use strict';
const { HomeyDevice } = require('../../lib/devices/HomeyDevice');

class WifiCameraDevice extends HomeyDevice {
  async onInit() {
    await super.onInit();
    this.log('WiFi Camera v5.9.12 Ready');
  }

  async onDeleted() {
    await super.onDeleted?.();
  }
}

module.exports = WifiCameraDevice;
