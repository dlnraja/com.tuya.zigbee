'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class ClimateSensorDriver extends ZigBeeDriver {
  getDeviceById(id) { try { return super.getDeviceById(id); } catch (err) { this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`); return null; } }

  onInit() {
    super.onInit();
    this.log('ClimateSensorDriver initialized');
  }
}

module.exports = ClimateSensorDriver;
