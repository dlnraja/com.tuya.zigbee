'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * Garage Door Opener - TS0601/TS0603
 */
class GarageDoorOpenerDevice extends TuyaZigbeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('[GarageOpener] 🚀 Initializing hardened driver...');
    await super.onNodeInit({ zclNode });

    const isEF00 = !!this._tuyaEF00Manager;

    // 1. EF00 (DataPoint) Mappings
    if (isEF00) {
      this._tuyaEF00Manager.dpMappings = {
        1: { capability: 'garagedoor_closed', converter: v => !v },
        3: { capability: 'alarm_contact', converter: v => !!v },
      };
    } else {
      // TS0603 Standard ZCL Handling
      this.log('[GarageOpener] Using standard ZCL endpoints (TS0603 style)');
      try {
        await this.safeRegisterCapability('garagedoor_closed', 'genOnOff', {
          get: 'onOff',
          report: 'onOff',
          reportParser: value => !value, // Typically ON = open = false, OFF = closed = true
          getOpts: { getOnStart: true }
        });
      } catch (err) {
        this.log('[GarageOpener] genOnOff register fail:', err.message);
      }
    }

    // 2. Capability Listeners
    if (this.hasCapability('garagedoor_closed')) {
      this.registerCapabilityListener('garagedoor_closed', async (value) => {
        this.log(`[GarageOpener] Setting state to: ${value ? 'CLOSED' : 'OPEN'}`);
        if (isEF00 && typeof this.sendTuyaCommand === 'function') {
          return this.sendTuyaCommand(1, !value ? 1 : 0, 'bool');
        } else {
          try {
            const endpoint = this.zclNode.endpoints[1] || this.zclNode.endpoints[0];
            const cluster = endpoint.clusters.genOnOff;
            if (cluster) {
              await cluster.writeAttributes({ onOff: !value });
            }
          } catch (e) {
            this.log('[GarageOpener] ZCL Command fail:', e.message);
            throw e;
          }
        }
      });
    }

    this.log('[GarageOpener] ✅ Ready');
  }

}

module.exports = GarageDoorOpenerDevice;
