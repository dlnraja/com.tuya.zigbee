'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiSwitch4gangDriver extends TuyaLocalDriver {
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
    this.homey.flow.getTriggerCard('wifi_switch_4gang_gang4_scene');
    this.homey.flow.getTriggerCard('wifi_switch_4gang_gang3_scene');
    this.homey.flow.getTriggerCard('wifi_switch_4gang_gang2_scene');
    this.homey.flow.getTriggerCard('wifi_switch_4gang_gang1_scene');
    this.homey.flow.getTriggerCard('wifi_switch_4gang_physical_gang4_off');
    this.homey.flow.getTriggerCard('wifi_switch_4gang_physical_gang4_on');
    this.homey.flow.getTriggerCard('wifi_switch_4gang_physical_gang3_off');
    this.homey.flow.getTriggerCard('wifi_switch_4gang_physical_gang3_on');
    this.homey.flow.getTriggerCard('wifi_switch_4gang_physical_gang2_off');
    this.homey.flow.getTriggerCard('wifi_switch_4gang_physical_gang2_on');
    this.homey.flow.getTriggerCard('wifi_switch_4gang_physical_gang1_off');
    this.homey.flow.getTriggerCard('wifi_switch_4gang_physical_gang1_on');
    await super.onInit();
    this.log('[WIFI-SWITCH-4GANG-DRV] Driver initialized');
  }
}

module.exports = WiFiSwitch4gangDriver;
