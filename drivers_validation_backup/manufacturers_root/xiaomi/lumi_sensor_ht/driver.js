'use strict';
const Homey = require('homey');
class xiaomi_lumi_sensor_ht_Driver extends Homey.Driver {
  async onInit() { this.log('xiaomi/lumi_sensor_ht driver initialized'); }
  async onPairListDevices() { return []; }
}
module.exports = xiaomi_lumi_sensor_ht_Driver;
