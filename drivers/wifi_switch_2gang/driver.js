'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiSwitch2gangDriver extends TuyaLocalDriver {
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
    this.homey.flow.getTriggerCard('wifi_switch_2gang_gang2_scene');
    this.homey.flow.getTriggerCard('wifi_switch_2gang_gang1_scene');
    this.homey.flow.getTriggerCard('wifi_switch_2gang_physical_gang2_off');
    this.homey.flow.getTriggerCard('wifi_switch_2gang_physical_gang2_on');
    this.homey.flow.getTriggerCard('wifi_switch_2gang_physical_gang1_off');
    this.homey.flow.getTriggerCard('wifi_switch_2gang_physical_gang1_on');
    await super.onInit();
    this.log('[WIFI-SWITCH-2GANG-DRV] Driver initialized');
  }
}

module.exports = WiFiSwitch2gangDriver;
