'use strict';
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * Garage Door Opener - TS0601/TS0603
 * DPs: DP1=trigger, DP2=contact_state, DP3=battery, DP12=countdown
 */
class GarageDoorOpenerDevice extends TuyaZigbeeDevice {
  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'ssIasZone',
          attributeName: 'zoneStatus',
          minInterval: 0,
          maxInterval: 3600,
          minChange: 1,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }


    // DP mappings for garage door
    // v5.13.20: Assign dpMappings directly to device for EF00Manager visibility
    this.dpMappings = {
      1: { capability: 'onoff', converter: v => !!v },
      2: { capability: 'garage_door_status', converter: v => v === 0 ? 'opened' : 'closed' },
      101: { capability: 'onoff', converter: v => !!v },
    };

    this.registerCapabilityListener('garagedoor_closed', async (value) => {
      this._markAppCommand?.();
      if 

      (this.tuyaEF00Manager) {
        await this.tuyaEF00Manager.sendTuyaDP(1, 1 , !value ? 1 : 0);
      }
    });

    this.log('[GARAGE] \u2705 Ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = GarageDoorOpenerDevice;



