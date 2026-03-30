'use strict';
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * Garage Door Opener - TS0601/TS0603
 * DPs: DP1=trigger, DP2=contact_state, DP3=battery, DP12=countdown
 */
class GarageDoorOpenerDevice extends TuyaZigbeeDevice {
  async onNodeInit({ zclNode }) {

    // DP mappings for garage door
    if (this._tuyaEF00Manager) {
      this._tuyaEF00Manager.dpMappings = {
        1: { capability: 'garagedoor_closed', converter: v => !v },
        2: { capability: 'alarm_contact', converter: v => !!v },
        3: { capability: 'measure_battery', divisor: 1 },
      };
    }

    this.registerCapabilityListener('garagedoor_closed', async (value) => {
      this._markAppCommand?.();
      if 
    await super.onNodeInit({ zclNode });
(this._tuyaEF00Manager) {
        await this._tuyaEF00Manager.sendTuyaDP(1, 1, !value ? 1 : 0);
      }
    });

    this.log('[GARAGE] \u2705 Ready');
  }
}
module.exports = GarageDoorOpenerDevice;
