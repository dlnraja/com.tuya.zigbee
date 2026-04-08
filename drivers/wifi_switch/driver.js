'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiSwitchDriver extends TuyaLocalDriver {
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
    this.log('[WIFI-SWITCH-DRV] Driver initialized');
    // v5.13.3: Flow card handlers
      const v = (() => { try { return (() => { try { return this.homey.flow.getActionCard('wifi_switch_toggle'); } catch(e) { return null; } })(); } catch(e) { return null; } })();
  }
}

module.exports = WiFiSwitchDriver;
