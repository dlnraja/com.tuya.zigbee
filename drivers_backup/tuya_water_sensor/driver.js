const Homey = require('homey');
const TuyaZigbeeDriver = require('../../lib/TuyaZigbeeDriver');

class WaterSensorDriver extends TuyaZigbeeDriver {
  async onInit() {
    this.log('WaterSensorDriver has been initialized');
  }

module.exports = WaterSensorDriver;
