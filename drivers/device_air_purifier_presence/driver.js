'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class PresenceSensorRadarDriver extends ZigBeeDriver {
  getDeviceById(id) { try { return super.getDeviceById(id); } catch (err) { this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`); return null; } }

  onInit() {
    super.onInit();
    this.log('PresenceSensorRadarDriver initialized');
  }
}

module.exports = PresenceSensorRadarDriver;
