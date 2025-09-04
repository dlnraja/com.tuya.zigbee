const Homey = require('homey');
const TuyaZigbeeDriver = require('../../../lib/TuyaZigbeeDriver');

class ContactSensorDriver extends TuyaZigbeeDriver {
  async onInit() {
    this.log('ContactSensorDriver has been initialized');
  }
}

module.exports = ContactSensorDriver;
