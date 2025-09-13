"use strict";
const Homey = require('homey');
class xiaomi_lumi_sensor_ht_Device extends Homey.Device {
  async onInit() { this.log('xiaomi/lumi_sensor_ht device initialized'); }
}
module.exports = xiaomi_lumi_sensor_ht_Device;
