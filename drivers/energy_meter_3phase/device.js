'use strict';
const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const { parsePhaseVariant2WithPhase } = require('../../lib/tuya/TuyaDataPointsZ2M');

class EnergyMeter3PhaseDevice extends PlugBase {
  get plugCapabilities() { return ['measure_power', 'meter_power', 'measure_voltage', 'measure_current']; }

  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'activePower',
          minInterval: 10,
          maxInterval: 300,
          minChange: 5,
        },
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'rmsVoltage',
          minInterval: 30,
          maxInterval: 600,
          minChange: 1,
        },
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'rmsCurrent',
          minInterval: 30,
          maxInterval: 600,
          minChange: 10,
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    await super.onNodeInit({ zclNode });
    this.log('[ENERGY-3PH] ✅ Ready');
  }

  _handleDP(dp, value) {
    if (dp === 115 || dp === 116 || dp === 117) {
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
            
            this.log(`[ENERGY-3PH-DECODER] Decoded DP ${dp} (Phase ${phaseLabel.toUpperCase()}): Power=${power}W, Voltage=${voltage}V, Current=${current}A`);
            
            if (this.hasCapability(`measure_power.phase${phaseNum}`)) {
              await this.setCapabilityValue(`measure_power.phase${phaseNum}`, power).catch(this.error);
            }
            
            // Set total/default voltage and current based on Phase 1
            if (dp === 115) {
              await this.setCapabilityValue('measure_voltage', voltage).catch(this.error);
              await this.setCapabilityValue('measure_current', current).catch(this.error);
            }
            
            // Re-calculate and set total power
            this._updateTotalPowerBase64();
            return; // Intercepted and handled successfully!
          } catch (err) {
            this.error(`[ENERGY-3PH-DECODER] Failed to decode DP ${dp} base64 telemetry:`, err.message);
          }
        }
      }
    }
    
    // Fall back to standard PlugBase handler
    super._handleDP(dp, value);
  }

  _updateTotalPowerBase64() {
    const p1 = this.getCapabilityValue('measure_power.phase1') || 0;
    const p2 = this.getCapabilityValue('measure_power.phase2') || 0;
    const p3 = this.getCapabilityValue('measure_power.phase3') || 0;
    await this.setCapabilityValue('measure_power', p1 + p2 + p3).catch(this.error);
  }

  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = EnergyMeter3PhaseDevice;
