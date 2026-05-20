'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class PlugEnergyDriver extends ZigBeeDriver {
  getDeviceById(id) { try { return super.getDeviceById(id); } catch (err) { this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`); return null; } }

  onInit() { super.onInit(); }
}
module.exports = PlugEnergyDriver;