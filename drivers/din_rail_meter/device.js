'use strict';

const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const EnergyJumpGuard = require('../../lib/tuya/EnergyJumpGuard');
const { parseTongouToqSysJztDp6 } = require('../../lib/tuya/DpByteArrayProfiles');
const { containsCI } = require('../../lib/utils/CaseInsensitiveMatcher');

/**
 * DIN rail energy meters (incl. Tongou TO-Q-SYS-JZT _TZE284_6ocnqlhn + TS0601).
 * WHY: Gmail diags 3a1f196d / 31e654a4 — mis-paired as smart_rcbo; DP6 raw was
 * dynamically mapped to measure_humidity. Z2M: din rail smart meter, not RCBO.
 */
class DinRailMeterDevice extends UnifiedPlugBase {

  get plugCapabilities() {
    return ['measure_power', 'meter_power', 'measure_voltage', 'measure_current', 'meter_power.exported'];
  }

  _isTongouToqSysJzt() {
    const mfr = this.getSetting('zb_manufacturer_name') || this._protocolInfo?.mfr || '';
    return containsCI(mfr, '_TZE284_6ocnqlhn');
  }

  async _migrateCapabilities() {
    const required = [];
    for (const cap of required) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(() => { });
      }
    }
  }

  get dpMappings() {
    if (this._isTongouToqSysJzt()) {
      return this._tongouDpMappings();
    }

    const powerScale = parseFloat(this.getSetting('power_scale') || '1');
    const bidirectional = this.getSetting('bidirectional') || false;

    return {
      ...super.dpMappings,
      1: { capability: 'meter_power', smartDivisor: true },
      6: {
        capability: bidirectional ? 'meter_power.exported' : null,
        divisor: 100,
      },
      18: { capability: 'measure_power', divisor: 1 / powerScale },
      19: { capability: 'measure_voltage', smartDivisor: true },
      20: { capability: 'measure_current', smartDivisor: true },
      17: { capability: 'measure_current', smartDivisor: true },
      101: { capability: null, internal: 'power_factor' },
      102: { capability: null, internal: 'frequency', divisor: 100 },
    };
  }

  /** Z2M dp_registry + device-truth for TO-Q-SYS-JZT (Tongou). */
  _tongouDpMappings() {
    return {
      1: { capability: 'meter_power', divisor: 100 },
      6: { capability: null, internal: 'tongou_electricity_raw' },
      16: { capability: null, internal: 'switch_state' },
      32: { capability: null, internal: 'ac_frequency', divisor: 100 },
      50: { capability: null, internal: 'power_factor', divisor: 100 },
      108: { capability: null, internal: 'control_mode' },
      125: { capability: 'measure_power', divisor: 8.2 },
      131: { capability: null, internal: 'temperature', smartDivisor: true },
    };
  }

  _handleDP(dpId, rawValue) {
    if (this._isTongouToqSysJzt() && dpId === 6) {
      this._handleTongouDp6(rawValue);
      return;
    }
    return super._handleDP(dpId, rawValue);
  }

  /**
   * DP6 on TO-Q-SYS-JZT is a raw electricity composite (Tuya type 0).
   * Block DynamicCapabilityManager humidity mis-map; extract V/A/W when sane.
   */
  _handleTongouDp6(rawValue) {
    const parsed = parseTongouToqSysJztDp6(rawValue);
    if (!parsed.ok) {
      this.log(`[TONGOU-JZT] DP6 ignored (${parsed.reason || 'parse_failed'}, len=${parsed.length || 0})`);
      return;
    }
    this.log(`[TONGOU-JZT] DP6 composite hex=${parsed.hex?.slice(0, 24)}… decoded=${JSON.stringify(parsed.decoded)}`);
    for (const [cap, val] of Object.entries(parsed.decoded || {})) {
      this.safeSetCapabilityValue(cap, val).catch(() => { });
    }
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      await super.onNodeInit({ zclNode });
      if (this._isTongouToqSysJzt()) {
        this.log('[DIN-METER] Tongou TO-Q-SYS-JZT profile active');
      } else {
        this.log('[DIN-METER] ✅ Ready');
      }
    }, 'onNodeInit');
  }

  async safeSetCapabilityValue(capability, value) {
    if (capability === 'meter_power' || capability === 'meter_power.exported') {
      // Seed parse meta so EnergyJumpGuard can teach SmartDivisor on sticky corrections
      if (!this._energyParseMeta) {
        this._energyParseMeta = {
          mfr: this.getSetting('zb_manufacturer_name') || this._protocolInfo?.mfr || '',
          dpId: 1,
          divisor: 100,
          capability: 'meter_power',
        };
      }
      value = EnergyJumpGuard.check(this, value);
    }
    return super.safeSetCapabilityValue(capability, value);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    await super.onSettings({ oldSettings, newSettings, changedKeys });

    if (changedKeys.includes('power_scale') || changedKeys.includes('bidirectional')) {
      this.log(`[DIN-METER] Settings changed, DP mappings will adapt: scale=${newSettings.power_scale}, bidi=${newSettings.bidirectional}`);
    }
  }

  async onDeleted() {
    if (this._destroyed) { return; }
    this._destroyed = true;
    this.log('Device deleted, cleaning up');
    if (super.onDeleted) { await super.onDeleted(); }
  }
}

module.exports = DinRailMeterDevice;
