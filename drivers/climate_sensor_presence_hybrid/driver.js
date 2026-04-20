'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class ClimateSensorPresenceDriver extends ZigBeeDriver {
  onInit() {
    super.onInit();
  }
}

module.exports = ClimateSensorPresenceDriver;
