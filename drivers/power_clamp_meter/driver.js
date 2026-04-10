'use strict';

const { Driver } = require('homey');

class PowerClampMeterDriver extends Driver {
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
    this.log('Power Clamp Meter driver initialized');
    // v5.13.3: Flow card handlers
      this.homey.flow.getActionCard('power_clamp_meter_reset_meter')
  }
}

module.exports = PowerClampMeterDriver;
