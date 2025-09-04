const Homey = require('homey');
const TuyaZigbeeDriver = require('../../../lib/TuyaZigbeeDriver');

class MultiSensorDriver extends TuyaZigbeeDriver {
  async onInit() {
    this.log('MultiSensorDriver has been initialized');
  }
}

module.exports = MultiSensorDriver;
