'use strict';

const { Driver } = require('homey');

class PowerMeterDriver extends Driver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    this.log('Power Meter driver initialized');
    // v5.13.3: Flow card handlers
      (() => { try { return this.homey.flow.getDeviceActionCard('power_meter_reset_meter'); } catch(e) { return null; } })();
  }
}

module.exports = PowerMeterDriver;
