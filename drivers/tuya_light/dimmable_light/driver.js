const Homey = require('homey');
const TuyaZigbeeDriver = require('../../../lib/TuyaZigbeeDriver');

class DimmableLightDriver extends TuyaZigbeeDriver {
  async onInit() {
    this.log('DimmableLightDriver has been initialized');
  }
}

module.exports = DimmableLightDriver;
