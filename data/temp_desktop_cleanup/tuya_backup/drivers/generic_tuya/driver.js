'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * GENERIC TUYA DRIVER
 * v5.5.583: CRITICAL FIX - Flow card run listeners were missing
 *
 * Fallback driver for unknown TS0601 Tuya devices.
 * Low priority matching - only matches if no other driver claims the device.
 */
class GenericTuyaDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Generic Tuya Driver v5.5.583 initialized');
    this.log('This driver handles unknown TS0601 devices with auto-discovery');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Battery above
    try {
      this.homey.flow.getConditionCard('generic_tuya_battery_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery > (args.level || 20);
        });
      this.log('[FLOW] ✅ generic_tuya_battery_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Request DP
    try {
      this.homey.flow.getActionCard('generic_tuya_request_dp')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          try {
            if (args.device._tuyaEF00Manager) {
              await args.device._tuyaEF00Manager.requestDatapoint(args.dp || 1);
            }
            return true;
          } catch (err) { return true; }
        });
      this.log('[FLOW] ✅ generic_tuya_request_dp');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] 🎉 Generic Tuya flow cards registered');
  }

  /**
   * Called when a device is being paired
   * We can add custom logic here if needed
   */
  async onPairListDevices() {
    this.log('Listing devices for pairing...');
    return [];
  }
}

module.exports = GenericTuyaDriver;
