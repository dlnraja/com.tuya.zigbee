'use strict';
const Homey = require('homey');

class TuyaTs0201Driver extends Homey.Driver {
  async onInit() {
    this.log('Tuya TS0201 Temperature driver initialized');
  }
  async onPairListDevices() {
    // Static pairing for manual add; real pairing discovered via Zigbee normally
    return [];
  }
}

module.exports = TuyaTs0201Driver;
