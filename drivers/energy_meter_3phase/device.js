'use strict';
const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const { parsePhaseVariant2WithPhase } = require('../../lib/tuya/TuyaDataPointsZ2M');

class EnergyMeter3PhaseDevice extends UnifiedPlugBase {
  // v9.7.3: 3-Phase Energy Meter with base64 telemetry support
  // Inherits hybrid ZCL/Tuya support from UnifiedPlugBase.

  get plugCapabilities() {
    return ['measure_power', 'meter_power', 'measure_voltage', 'measure_current'];
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      // v9.7.3: Unified initialization
      await super.onNodeInit({ zclNode });
      this.log('[ENERGY-3PH] ✅ v9.7.3 Standardized initialization complete');
    }, 'onNodeInit');
  }

  /**
   * v9.7.3: Enhanced DP handler with specialized base64 decoding for multi-phase telemetry
   */
  _handleDP(dp, value) {
    // DPs 115, 116, 117 contain base64 encoded phase telemetry
    if ([115, 116, 117].includes(dp)) {
      if (typeof value === 'string' || Buffer.isBuffer(value)) {
        const base64Str = Buffer.isBuffer(value) ? value.toString('base64') : value;
        if (base64Str && !/^\d+$/.test(base64Str)) {
          try {
            const phaseLabel = dp === 115 ? 'a' : (dp === 116 ? 'b' : 'c');
            const phaseNum = dp === 115 ? '1' : (dp === 116 ? '2' : '3');
            const decoded = parsePhaseVariant2WithPhase(base64Str, phaseLabel);
            
            const voltage = decoded[`voltage_${phaseLabel}`];
            const current = decoded[`current_${phaseLabel}`];
            const power = decoded[`power_${phaseLabel}`];
            
            this.log(`[ENERGY-3PH] Phase ${phaseLabel.toUpperCase()}: Power=${power}W, Voltage=${voltage}V, Current=${current}A`);
            
            if (this.hasCapability(`measure_power.phase${phaseNum}`)) {
              this.setCapabilityValue(`measure_power.phase${phaseNum}`, power).catch(this.error);
            }
            
            // Phase A (DP115) updates the main voltage/current sensors
            if (dp === 115) {
              this.setCapabilityValue('measure_voltage', voltage).catch(this.error);
              this.setCapabilityValue('measure_current', current).catch(this.error);
            }
            
            // Re-calculate total power
            this._updateTotalPower();
            return; // Handled
          } catch (err) {
            this.error(`[ENERGY-3PH] Telemetry decode failed (DP${dp}):`, err.message);
          }
        }
      }
    }
    
    // Fall back to standard UnifiedPlugBase handler for other DPs (1, 101, etc)
    super._handleDP(dp, value);
  }

  /**
   * v9.7.3: Calculate and update total power from all phases
   */
  _updateTotalPower() {
    const p1 = this.getCapabilityValue('measure_power.phase1') || 0;
    const p2 = this.getCapabilityValue('measure_power.phase2') || 0;
    const p3 = this.getCapabilityValue('measure_power.phase3') || 0;
    const total = p1 + p2 + p3;
    
    this.setCapabilityValue('measure_power', total).catch(this.error);
  }

  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = EnergyMeter3PhaseDevice;
