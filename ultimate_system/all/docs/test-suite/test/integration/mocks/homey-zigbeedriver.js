// Lightweight Jest mock for `homey-zigbeedriver`
// Provides minimal classes used in unit tests without requiring the real package.

class ZigBeeDevice {
  constructor() {
    this.initialized = true;
  }
  async onInit() {}
  async onAdded() {}
  async onDeleted() {}
}

class ZigBeeLightDevice extends ZigBeeDevice {}

module.exports = {
  ZigBeeDevice,
  ZigBeeLightDevice,
};
