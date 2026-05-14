'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const { containsCI } = require('../../lib/utils/CaseInsensitiveMatcher');
const { parsePhaseVariant2WithPhase } = require('../../lib/tuya/TuyaDataPointsZ2M');

/**
 * CT Clamp Power Meter Device
 * v5.7.9: Enhanced zero-current handling + better mfr detection (Z2M #22248)
 * v5.7.7: Guard undefined values (diagnostic a0f7de6a)
 * v5.7.5: FIXED DP mappings for PJ-1203A per Z2M #18419
 *
 * Non-invasive current monitoring via CT clamps
 * Supports single-phase, 2-channel (A/B), and 3-phase configurations
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PJ-1203A 2-CHANNEL DP MAPPINGS (CORRECTED from Z2M #18419):
 * ═══════════════════════════════════════════════════════════════════════════
 * DP101: power_a (W ÷10)
 * DP102: power_direction_a (0=forward, 1=reverse)
 * DP104: power_direction_b
 * DP105: power_b (W ÷10)
 * DP106: energy_forward_a (kWh ÷100)
 * DP107: energy_reverse_a (kWh ÷100)
 * DP108: energy_forward_b (kWh ÷100)
 * DP109: energy_reverse_b (kWh ÷100)
 * DP110: power_factor_a (÷100)
 * DP111: ac_frequency (Hz ÷100)
 * DP112: voltage (V ÷10)
 * DP113: current_a (A ÷1000)
 * DP114: current_b (A ÷1000)
 * DP115: power_ab (W ÷10) - Total power
 * DP121: power_factor_b (÷100)
 * DP129: update_frequency (seconds)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 3-PHASE DP MAPPINGS:
class PowerClampMeterDevice extends UnifiedPlugBase {
  // v9.7.3: CT Clamp Power Meter with hybrid PJ-1203A / 3-Phase profiles
  // Inherits robust orchestration and scaling from UnifiedPlugBase.

  get plugCapabilities() {
    // Clamps are sensors, no onoff relay
    return ['measure_power', 'meter_power', 'measure_current', 'measure_voltage', 'measure_power.phase1', 'measure_power.phase2', 'measure_power.phase3'];
  }

  // v9.7.3: Integrate CT ratio into ZCL divisors
  get zclEnergyDivisors() {
    const base = super.zclEnergyDivisors;
    const ctRatio = parseFloat(this.getSetting('ct_ratio')) || 1;
    return {
      ...base,
      current: base.current / ctRatio // Multiplies final result by ctRatio
    };
  }

  /**
   * v5.7.6: Detect meter profile based on manufacturerName
   */
  get meterProfile() {
    const mfr = this.getSetting('zb_manufacturer_name') || this.getData().manufacturerName || '';
    const pj1203aIds = [
      '_TZE284_81yrt3lo', '_TZE204_81yrt3lo',
      '_TZE284_81yrt3l', '_TZE204_81yrt3l',
      '_TZE200_81yrt3lo',
      '_TZE204_cjbofhxw', '_TZE284_cjbofhxw'
    ];
    return pj1203aIds.some(id => containsCI(mfr, id)) ? 'pj1203a' : '3phase';
  }

  get dpMappings() {
    const profile = this.meterProfile;
    const ctRatio = parseFloat(this.getSetting('ct_ratio')) || 1;

    if (profile === 'pj1203a') {
      return {
        111: { capability: 'measure_frequency', divisor: 100 },
        112: { capability: 'measure_voltage', divisor: 10 },
        113: { capability: 'measure_current', divisor: 1000 / ctRatio },
        115: { capability: 'measure_power', divisor: 10 },
        129: { capability: null, internal: 'update_frequency' }
      };
    }

    // Default 3-phase mappings
    return {
      1: { capability: 'meter_power', divisor: 100 },
      19: { capability: 'measure_voltage', divisor: 10 },
      20: { capability: 'measure_current', divisor: 1000 / ctRatio },
      101: { capability: 'measure_power', divisor: 1 },
      102: { capability: 'meter_power', divisor: 100 }
    };
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      // v9.7.3: Unified initialization
      await super.onNodeInit({ zclNode });
      // Initialize state for complex multi-channel recalcs
      this._powerA = 0;
      this._powerB = 0;
      this._energyA = 0;
      this._energyB = 0;
      this.log(`[METER] ✅ v9.7.3 Ready (Profile: ${this.meterProfile})`);
    }, 'onNodeInit');
  }

  /**
   * v9.7.3: Enhanced DP handler for complex PJ-1203A bidirectional logic and base64 telemetry
   */
  _handleDP(dp, value) {
    if (value === undefined || value === null) return;

    // Handle Base64 encoded telemetry (Owon/PJ bidirectional variants)
    if ([115, 116, 117].includes(dp) && (typeof value === 'string' || Buffer.isBuffer(value))) {
      const base64Str = Buffer.isBuffer(value) ? value.toString('base64') : value;
      if (base64Str && !/^\d+$/.test(base64Str)) {
        this._handleBase64Telemetry(dp, base64Str);
        return;
      }
    }

    const profile = this.meterProfile;
    const ctRatio = parseFloat(this.getSetting('ct_ratio')) || 1;

    // Specialized logic for PJ-1203A multi-channel aggregation
    if (profile === 'pj1203a') {
      switch (dp) {
        case 101: // Power A
          this._powerA = value / 10;
          this.setCapabilityValue('measure_power.phase1', this._powerA).catch(() => {});
          this._updateTotalPower();
          return;
        case 105: // Power B
          this._powerB = value / 10;
          this.setCapabilityValue('measure_power.phase2', this._powerB).catch(() => {});
          this._updateTotalPower();
          return;
        case 106: // Energy A
          this._energyA = value / 100;
          this._updateTotalEnergy();
          return;
        case 108: // Energy B
          this._energyB = value / 100;
          this._updateTotalEnergy();
          return;
        case 114: // Current B
          this.setCapabilityValue('measure_current.phase2', (value / 1000) * ctRatio).catch(() => {});
          return;
        case 110: // PF A
        case 121: // PF B
          const pfc = dp === 110 ? 'measure_power_factor.phase1' : 'measure_power_factor.phase2';
          if (this.hasCapability(pfc)) this.setCapabilityValue(pfc, value / 100).catch(() => {});
          return;
      }
    }

    // Specialized logic for 3-Phase aggregation
    if (profile === '3phase') {
      switch (dp) {
        case 16: case 17: case 18:
          const pNum = dp - 15;
          this.setCapabilityValue(`measure_power.phase${pNum}`, value).catch(() => {});
          this._updateTotalPower();
          return;
        case 20: case 21: case 22:
          // 3-phase usually reports main current on DP20/21/22
          this.setCapabilityValue('measure_current', (value / 1000) * ctRatio).catch(() => {});
          return;
      }
    }

    super._handleDP(dp, value);
  }

  _handleBase64Telemetry(dp, base64Str) {
    try {
      const phaseLabel = dp === 115 ? 'a' : (dp === 116 ? 'b' : 'c');
      const phaseNum = dp === 115 ? '1' : (dp === 116 ? '2' : '3');
      const decoded = parsePhaseVariant2WithPhase(base64Str, phaseLabel);
      
      const voltage = decoded[`voltage_${phaseLabel}`];
      const current = decoded[`current_${phaseLabel}`];
      const power = decoded[`power_${phaseLabel}`];
      
      this.log(`[DECODER] Phase ${phaseLabel.toUpperCase()}: Power=${power}W, Voltage=${voltage}V, Current=${current}A`);
      
      if (this.hasCapability(`measure_power.phase${phaseNum}`)) {
        this.setCapabilityValue(`measure_power.phase${phaseNum}`, power).catch(() => {});
      }
      
      if (dp === 115) {
        this.setCapabilityValue('measure_voltage', voltage).catch(() => {});
        this.setCapabilityValue('measure_current', current).catch(() => {});
      }
      this._updateTotalPower();
    } catch (err) {
      this.error('[DECODER] Failed:', err.message);
    }
  }

  _updateTotalPower() {
    const p1 = this.getCapabilityValue('measure_power.phase1') || this._powerA || 0;
    const p2 = this.getCapabilityValue('measure_power.phase2') || this._powerB || 0;
    const p3 = this.getCapabilityValue('measure_power.phase3') || 0;
    this.setCapabilityValue('measure_power', p1 + p2 + p3).catch(() => {});
  }

  _updateTotalEnergy() {
    const e1 = this._energyA || 0;
    const e2 = this._energyB || 0;
    this.setCapabilityValue('meter_power', e1 + e2).catch(() => {});
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('ct_ratio')) {
      this.log(`[METER] CT ratio changed to: ${newSettings.ct_ratio}`);
    }
    return super.onSettings({ oldSettings, newSettings, changedKeys });
  }

  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}


module.exports = PowerClampMeterDevice;
