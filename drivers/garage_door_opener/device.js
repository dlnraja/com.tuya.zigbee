'use strict';

const BaseUnifiedDevice = require('../../lib/devices/BaseUnifiedDevice');

/**
 * Garage Door Opener - TS0601/TS0603
 */
class GarageDoorOpenerDevice extends BaseUnifiedDevice {

  async onNodeInit({ zclNode }) {
    this.log('[GarageOpener] 🚀 Initializing hardened driver...');
    if (this.hasCapability('measure_luminance')) {
      await this.removeCapability('measure_luminance').catch(() => {});
      this.log('[GarageOpener] Removed stale measure_luminance capability');
    }
    await super.onNodeInit({ zclNode });

    // TS0603 ZCL Fallback
    if (this.zclNode && this.zclNode.endpoints && this.zclNode.endpoints[1] && this.zclNode.endpoints[1].clusters && this.zclNode.endpoints[1].clusters.genOnOff) {
      this.log('[GarageOpener] ⚠️ Detected standard ZCL OnOff cluster for TS0603. Using standard Zigbee implementation.');
      this.registerCapability('garagedoor_closed', 'genOnOff', {
        get: 'onOff',
        reportParser: value => !value,
        set: value => !value,
      });
      return;
    }

    // 1. DP Mappings
    if (this._tuyaEF00Manager) {
      this._tuyaEF00Manager.dpMappings = {
        1: { capability: 'garagedoor_closed', converter: v => !v },
        3: { capability: 'alarm_contact', converter: v => !!v },
      };
    }

    // 2. Capability Listeners
    this.registerCapabilityListener('garagedoor_closed', async (value) => {
      if (typeof this._markAppCommand === 'function') { this._markAppCommand(1, value); }
      this.log(`[GarageOpener] Setting state to: ${value ? 'CLOSED' : 'OPEN'}`);
      return this.sendTuyaCommand(1, !value ? 1 : 0, 'bool');
    });

    this.log('[GarageOpener] ✅ Ready');
  }

}

module.exports = GarageDoorOpenerDevice;
