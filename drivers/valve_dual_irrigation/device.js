'use strict';

const BaseUnifiedDevice = require('../../lib/devices/BaseUnifiedDevice');

/**
 * 
 *       DUAL IRRIGATION VALVE - Unified Engine Protocol                         
 * 
 *   Supports: _TZE284_fhvpaltk, _TZE284_eaet5qt5 (Insoma Two-Way)                
 *   DPs: 1=V1 ON/OFF, 2=V2 ON/OFF, 13=Countdown1, 14=Countdown2,                 
 *        25=Duration1, 26=Duration2, 59=Battery, 104=Status1, 105=Status2        
 * 
 */
class ValveDualIrrigationDevice extends BaseUnifiedDevice {

  _isValveOn(value) {
    if (typeof value === 'boolean') {return value;}
    if (typeof value === 'number') {return value === 1;}
    if (typeof value === 'string') {
      return ['1', 'true', 'on', 'open', 'opened', 'running', 'watering'].includes(value.toLowerCase());
    }
    return false;
  }

  _toTuyaDPType(type) {
    const normalized = String(type || 'value').toLowerCase();
    return ({ raw: 0, bool: 1, boolean: 1, value: 2, string: 3, enum: 4, bitmap: 5 })[normalized] ?? 2;
  }
  async _safeSetValveCapability(capability, value) {
    if (typeof this.safeSetCapabilityValue === 'function') {
      await this.safeSetCapabilityValue(capability, value).catch(() => {});
      return;
    }
    const setCapabilityValue = this['setCapabilityValue'];
    if (typeof setCapabilityValue === 'function') {
      await setCapabilityValue.call(this, capability, value).catch(() => {});
    }
  }

  get dpMappings() {
    return {
      // Valve 1
      1: { capability: 'onoff.valve_1', transform: (v) => this._isValveOn(v) },
      104: { capability: 'onoff.valve_1', transform: (v) => this._isValveOn(v) }, // Status reporting
      13: { capability: 'countdown_remaining' },
      25: { internal: 'duration_1' },

      // Valve 2
      2: { capability: 'onoff.valve_2', transform: (v) => this._isValveOn(v) },
      105: { capability: 'onoff.valve_2', transform: (v) => this._isValveOn(v) }, // Status reporting
      14: { capability: 'countdown_remaining' },
      26: { internal: 'duration_2' },

      // GIEX 2-zone (DP3=countdown, DP5=battery)
      3: { capability: 'countdown_remaining' },
      5: { capability: 'measure_battery', divisor: 1, transform: (v) => Math.min(100, Math.max(0, v)) },

      // Battery (Research research shows DP 59 for these dual valves, DP 101/15 as fallback)
      59: { capability: 'measure_battery', divisor: 1, transform: (v) => Math.min(100, Math.max(0, v)) },
      101: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    // Register capability listeners for BOTH valves
    this.registerCapabilityListener('onoff.valve_1', async (value) => {
      this.log(`[VALVE-2] Setting Valve 1 = ${value}`);
      // Insoma valves often require explicit 1/0 as bool
      await this.sendDP(1, value ? true : false, 'bool');
      await this.safeSetCapabilityValue?.('onoff.valve_1', Boolean(value)).catch(() => {});
      });

    this.registerCapabilityListener('onoff.valve_2', async (value) => {
      this.log(`[VALVE-2] Setting Valve 2 = ${value}`);
      await this.sendDP(2, value ? true : false, 'bool');
      await this.safeSetCapabilityValue?.('onoff.valve_2', Boolean(value)).catch(() => {});
      });

    this.log('[VALVE-2]  Ready (Dual Engine v7.4.4)');
  }

  // Override sendDP to keep dual-valve actions working across manager variants.
  async sendDP(dp, value, type = 'bool') {
    const manager = this.tuyaEF00Manager || this._tuyaEF00Manager;

    if (manager) {
      if (typeof manager.sendDP === 'function') {
        const sent = await manager.sendDP(dp, value, type, { retries: 1, timeout: 2500, expectEcho: false });
        if (sent !== false) {return sent;}
      }
      if (typeof manager.sendDPWithConfirmation === 'function') {
        const result = await manager.sendDPWithConfirmation(dp, value, type, { retries: 1, timeout: 2500, expectEcho: false });
        if (result?.success) {return true;}
      }
      if (typeof manager._sendDPRaw === 'function') {
        const sent = await manager._sendDPRaw(dp, value, type);
        if (sent) {return true;}
      }
      if (typeof manager.sendTuyaDP === 'function') {
        const sent = await manager.sendTuyaDP(dp, this._toTuyaDPType(type), value);
        if (sent) {return true;}
      }
    }

    if (typeof this._sendTuyaDP === 'function') {
      return this._sendTuyaDP(dp, value, type);
    }

    this.error('[VALVE-2] Error: no Tuya DP sender available');
    throw new Error('tuya_dp_sender_not_found');
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = ValveDualIrrigationDevice;
