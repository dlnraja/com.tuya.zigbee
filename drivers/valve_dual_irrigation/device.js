'use strict';

const BaseUnifiedDevice = require('../../lib/devices/BaseUnifiedDevice');
const {
  forcePureTuyaDp,
  sendEf00DpMaxFallback,
  isKnownEf00OnlyManufacturer,
} = require('../../lib/zigbee/Ef00OnlyInterview');

/**
 *
 *       DUAL IRRIGATION VALVE - Unified Engine Protocol
 *
 *   Supports: _TZE284_fhvpaltk, _TZE284_eaet5qt5 (Insoma Two-Way)
 *   Interview: [0,4,5,61184] EF00-only — never require OnOff(6) (Joep #2218 / P2468/P2473)
 *   DPs: 1=V1 ON/OFF, 2=V2 ON/OFF, 13=Countdown1, 14=Countdown2,
 *        25=Duration1, 26=Duration2, 59=Battery, 104=Status1, 105=Status2
 *   TX: max EF00/raw fallback cascade (same class as Moes ZTS P2467)
 *
 */
class ValveDualIrrigationDevice extends BaseUnifiedDevice {

  _isInsomaEf00Only() {
    const mfr = this.getSetting?.('zb_manufacturer_name')
      || this.getData?.()?.manufacturerName
      || '';
    return isKnownEf00OnlyManufacturer(mfr) || /fhvpaltk|eaet5qt5/i.test(String(mfr));
  }

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
    return { raw: 0, bool: 1, boolean: 1, value: 2, string: 3, enum: 4, bitmap: 5 }[normalized] ?? 2;
  }

  get dpMappings() {
    return {
      // Valve 1
      1: { capability: 'onoff.valve_1', transform: (v) => this._isValveOn(v) },
      104: { internal: 'status_1', transform: (v) => this._normalizeValveStatus(v) },
      13: { internal: 'countdown_minutes_1' },
      25: { internal: 'last_duration_seconds_1' },

      // Valve 2
      2: { capability: 'onoff.valve_2', transform: (v) => this._isValveOn(v) },
      105: { internal: 'status_2', transform: (v) => this._normalizeValveStatus(v) },
      14: { internal: 'countdown_minutes_2' },
      26: { internal: 'last_duration_seconds_2' },

      // Exact Insoma battery datapoint. Do not borrow fallback DPs from other
      // two-zone irrigation products that happen to share modelId TS0601.
      59: { capability: 'measure_battery', transform: (v) => this._normalizeBattery(v) },
    };
  }

  _normalizeDPValue(value) {
    if (Buffer.isBuffer(value)) {
      if (value.length === 0) {return null;}
      if (value.length <= 6) {return value.readUIntBE(0, value.length);}
      return value.toString('hex');
    }
    if (Array.isArray(value)) {
      return this._normalizeDPValue(Buffer.from(value));
    }
    if (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value.trim())) {
      return Number(value);
    }
    return value;
  }

  _normalizeBattery(value) {
    const numeric = Number(this._normalizeDPValue(value));
    if (!Number.isFinite(numeric)) {return null;}
    return Math.min(100, Math.max(0, numeric));
  }

  _normalizeValveStatus(value) {
    const normalized = this._normalizeDPValue(value);
    return { 0: 'manual', 1: 'auto', 2: 'idle' }[normalized] || 'unknown';
  }

  async _handleDualValveDP(dpId, rawValue) {
    if (this._destroyed) {return false;}

    const mapping = this.dpMappings[Number(dpId)];
    if (!mapping) {return false;}

    let value = this._normalizeDPValue(rawValue);
    if (typeof mapping.transform === 'function') {
      value = mapping.transform(value);
    } else if (mapping.divisor && typeof value === 'number') {
      value /= mapping.divisor;
    }

    if (mapping.internal) {
      this._dualValveState = this._dualValveState || {};
      this._dualValveState[mapping.internal] = value;
      await this.setStoreValue(`dual_valve_${mapping.internal}`, value).catch(() => {});
      return true;
    }

    if (!mapping.capability || value === null || value === undefined) {return false;}

    // Capture previous state so flow triggers fire only on real changes.
    const previousValue = this.hasCapability?.(mapping.capability)
      ? this.getCapabilityValue(mapping.capability)
      : undefined;

    await this.safeSetCapabilityValue(mapping.capability, value);
    this._fireDualValveFlowTriggers(mapping.capability, value, previousValue);
    return true;
  }

  /**
   * Fire the driver flow triggers declared in driver.flow.compose.json
   * (turned_on / turned_off / battery_low) when DP reports change the
   * physical state. Without this the declared trigger cards never fired.
   */
  _fireDualValveFlowTriggers(capability, value, previousValue) {
    try {
      if (value === previousValue || typeof this.triggerFlowCard !== 'function') {return;}

      if (capability === 'onoff.valve_1' || capability === 'onoff.valve_2') {
        const cardId = value
          ? 'valve_dual_irrigation_valve_irrigation_turned_on'
          : 'valve_dual_irrigation_valve_irrigation_turned_off';
        this.triggerFlowCard(cardId).catch(() => {});
      } else if (capability === 'measure_battery' && typeof value === 'number') {
        const wasLow = typeof previousValue === 'number' && previousValue <= 20;
        if (value <= 20 && !wasLow) {
          this.triggerFlowCard('valve_dual_irrigation_valve_irrigation_battery_low').catch(() => {});
        }
      }
    } catch (err) {
      this.log('[VALVE-2] Flow trigger failed:', err.message);
    }
  }

  async onNodeInit({ zclNode }) {
    // WHY(P2473 / Joep #2218): interview [0,4,5,61184] — force pure EF00 before hybrid
    // can prefer hollow OnOff(6) and leave TX dead / pairing Unknown.
    if (this._isInsomaEf00Only()) {
      forcePureTuyaDp(this, { force: true });
      this.log('[VALVE-2] P2473 EF00-only interview — pure Tuya DP (no ZCL OnOff)');
    }

    await super.onNodeInit({ zclNode });

    // Re-arm EF00 BoundCluster + raw listen (Moes P2467: create ≠ initialize)
    try {
      const mgr = this.tuyaEF00Manager || this._tuyaEF00Manager;
      if (mgr && zclNode && typeof mgr.initialize === 'function') {
        await mgr.initialize(zclNode);
        this.log('[VALVE-2] P2473 TuyaEF00Manager.initialize(zclNode) armed');
      }
    } catch (e) {
      this.log('[VALVE-2] P2473 EF00 initialize soft:', e.message);
    }

    // BaseUnifiedDevice owns the EF00 manager, but it does not consume a
    // child driver's dpMappings. Subscribe explicitly so reports update the
    // two independent valve capabilities and their per-zone state.
    if (this.tuyaEF00Manager?.on && !this._dualValveDPReportListener) {
      this._dualValveDPReportListener = ({ dpId, value }) => {
        this._handleDualValveDP(dpId, value)
          .catch(err => this.error(`[VALVE-2] DP${dpId} handling failed:`, err.message));
      };
      this.tuyaEF00Manager.on('dpReport', this._dualValveDPReportListener);
    }

    // Register capability listeners for BOTH valves
    this.registerCapabilityListener('onoff.valve_1', async (value) => {
      this.log(`[VALVE-2] Setting Valve 1 = ${value}`);
      await this._sendValveDP(1, 'onoff.valve_1', value);
      });

    this.registerCapabilityListener('onoff.valve_2', async (value) => {
      this.log(`[VALVE-2] Setting Valve 2 = ${value}`);
      await this._sendValveDP(2, 'onoff.valve_2', value);
      });

    // P112: button.1 was declared but never wired (Joep #2102/#2105).
    // Treat as a one-shot "pulse valve 1 on" scene button through L14.
    if (typeof this.hasCapability === 'function' && this.hasCapability('button.1')) {
      this.registerCapabilityListener('button.1', async () => {
        if (this._destroyed) {return false;}
        this.log('[VALVE-2] button.1 pressed — pulse valve 1');
        await this._sendValveDP(1, 'onoff.valve_1', true);
        if (typeof this.safeSetCapabilityValue === 'function') {
          await this.safeSetCapabilityValue('button.1', true).catch(() => {});
        }
        return true;
      });
    }

    this.log('[VALVE-2]  Ready (Dual Engine v7.4.4 + P2473 EF00 max fallback)');
  }

  async _sendValveDP(dp, capability, value) {
    const sent = await this.sendDP(dp, Boolean(value), 'bool');
    if (!this._isValveDPSendSuccess(sent)) {
      throw new Error(`valve_dp_${dp}_not_sent`);
    }
    await this.safeSetCapabilityValue?.(capability, Boolean(value)).catch(() => {});
    return true;
  }

  _isValveDPSendSuccess(result) {
    // v9.0.417 (P92.124): undefined/null means the frame was EMITTED
    // fire-and-forget without error (TuyaEF00Manager.sendDP resolves
    // undefined on the raw-send path). A transport failure rejects the
    // promise instead. Treating undefined as failure made every valve
    // command throw "not_sent" even when the valve actuated — Joep's
    // "right actions but isn't working" (forum #2102/#2105).
    if (result === false) {return false;}
    if (result && typeof result === 'object') {
      return result.success === true || result.status === 'success';
    }
    return true;
  }

  // WHY(P2473): max EF00/raw/PFC cascade — never depend on ZCL OnOff(6)
  async sendDP(dp, value, type = 'bool') {
    try {
      return await sendEf00DpMaxFallback(this, dp, value, type);
    } catch (err) {
      this.error('[VALVE-2] P2473 max fallback exhausted:', err.message, err.attempts || []);
      throw err;
    }
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    if (this._destroyed) {return;}
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') {this._updateLastSeen();}
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
      await Promise.resolve(this._dataRecoveryManager.triggerRecovery()).catch(err => {
        this.log('[REJOIN] State recovery failed:', err.message);
      });
    }
  }

  async onDeleted() {
    if (this.tuyaEF00Manager && this._dualValveDPReportListener) {
      this.tuyaEF00Manager.removeListener('dpReport', this._dualValveDPReportListener);
      this._dualValveDPReportListener = null;
    }
    await super.onDeleted();
  }
}

module.exports = ValveDualIrrigationDevice;
