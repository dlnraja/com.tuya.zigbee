'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * Garage Door Opener - TS0601/TS0603
 */
class GarageDoorOpenerDevice extends TuyaZigbeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('[GarageOpener] 🚀 Initializing hardened driver...');
    await super.onNodeInit({ zclNode });

    // 1. DP Mappings
    if (this._tuyaEF00Manager) {
      this._tuyaEF00Manager.dpMappings = {
        1: { capability: 'garagedoor_closed', converter: v => !v },
        3: { capability: 'alarm_contact', converter: v => !!v },
      };
    }

    // 2. Capability Listeners
    this.registerCapabilityListener('garagedoor_closed', async (value) => {
      this.log(`[GarageOpener] Setting state to: ${value ? 'CLOSED' : 'OPEN'}`);
      return this.sendTuyaCommand(1, !value ? 1 : 0, 'bool');
    });

    this.log('[GarageOpener] ✅ Ready');
  }

}

module.exports = GarageDoorOpenerDevice;
