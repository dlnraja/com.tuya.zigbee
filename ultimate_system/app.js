'use strict';
const Homey = require('homey');
class UniversalTuyaApp extends Homey.App {
  async onInit() {
    this.log('Universal Tuya Zigbee initialized');
  }
}
module.exports = UniversalTuyaApp;