'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.585: CRITICAL FIX - Flow card run listeners were missing
 */
class ButtonWirelessDriver extends ZigBeeDriver {
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
    this.log('ButtonWirelessDriver v5.5.585 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Battery above
    try {
      this.homey.flow.getConditionCard('button_wireless_battery_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery > (args.level || 20);
        });
      this.log('[FLOW] ✅ button_wireless_battery_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW]  Button wireless flow cards registered');
  }
}

module.exports = ButtonWirelessDriver;
