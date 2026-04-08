'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiThermostatDriver extends TuyaLocalDriver {
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
    await super.onInit();
    this.log('[WIFI-THERMOSTAT-DRV] Driver initialized');
    // v5.13.3: Flow card handlers
      (() => { try { return this.homey.flow.getDeviceActionCard('wifi_thermostat_set_temp'); } catch(e) { return null; } })();
  }
}

module.exports = WiFiThermostatDriver;
