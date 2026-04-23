'use strict';
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * Zigbee Pet Feeder - TS0601
 * DPs: DP3=feed_portion, DP4=manual_feed, DP6=food_low_alarm,
 *       DP13=feed_report, DP101=weight
 */
class PetFeederZigbeeDevice extends TuyaZigbeeDevice {
  async onNodeInit({ zclNode }) {

    // v5.13.20: Assign dpMappings directly to device for EF00Manager visibility
    this.dpMappings = {
      6: { capability: 'alarm_generic', converter: v => !!v },
      101: { capability: 'measure_weight', divisor: 1 },
    };

    this.registerCapabilityListener('button', async () => {
      this._markAppCommand?.();
      if (this.tuyaEF00Manager) {
        // DP4: manual feed (1 portion)
        await this.tuyaEF00Manager.sendTuyaDP(4, 2, 1);
      }
    });

    this.log('[PET-FEEDER] \u2705 Ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = PetFeederZigbeeDevice;


