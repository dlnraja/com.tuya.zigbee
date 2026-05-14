'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * Zigbee Pet Feeder - TS0601
 */
class PetFeederZigbeeDevice extends TuyaZigbeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('[PetFeeder] 🚀 Initializing hardened driver...');
    await super.onNodeInit({ zclNode });

    // 1. DP Mappings
    if (this._tuyaEF00Manager) {
      this._tuyaEF00Manager.dpMappings = {
        6: { capability: 'alarm_generic', converter: v => !!v },
        101: { capability: 'measure_weight', divisor: 1 },
      };
    }

    // 2. Capability Listeners
    if (this.hasCapability('button')) {
      this.registerCapabilityListener('button', async () => {
        this.log('[PetFeeder] 🥣 Manual feed triggered');
        // DP4: manual feed (1 portion)
        return this.sendTuyaCommand(4, 1, 'value');
      });
    }

    this.log('[PetFeeder] ✅ Ready');
  }

}

module.exports = PetFeederZigbeeDevice;
