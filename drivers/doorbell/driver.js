'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.571: CRITICAL FIX - Flow card run listeners were missing
 */
class TuyaDoorbellDriver extends ZigBeeDriver {
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
    this.log('TuyaDoorbellDriver v5.5.571 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Battery above threshold
    try {
      this.homey.flow.getConditionCard('doorbell_battery_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery > (args.threshold || 20);
        });
      this.log('[FLOW] ✅ doorbell_battery_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Ring chime
    try {
      this.homey.flow.getActionCard('doorbell_ring_chime')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          try {
            if (args.device._tuyaEF00Manager) {
              await args.device._tuyaEF00Manager.sendDatapoint(1, true, 'bool');
            }
            return true;
          } catch (err) { return true; }
        });
      this.log('[FLOW] ✅ doorbell_ring_chime');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW]  Doorbell flow cards registered');
  }
}

module.exports = TuyaDoorbellDriver;
