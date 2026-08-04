'use strict';
const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');

class EnergyMeter3PhaseDevice extends UnifiedPlugBase {
  get plugCapabilities() { return ['measure_power', 'meter_power', 'measure_voltage', 'measure_current', 'measure_power.phase_total']; }

  /**
   * Override dpMappings to add 3-phase specific DPs
   * DP 23: Energy produced/exported (kWh ÷ 100)
   * DP 29: Total active power (W ÷ 10)
   */
  get dpMappings() {
    const base = super.dpMappings || {};
    return {
      ...base,
      23: { capability: 'meter_power.exported', divisor: 100 },
      29: { capability: 'measure_power.phase_total', divisor: 10 },
    };
  }
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

    // v5.12.56 (P92.124): per-phase power via haElectricalMeasurement on
    // endpoints 1/2/3 → measure_power.phase1/2/3 (declared in the compose
    // but never fed). Falls back silently on single-endpoint devices.
    for (let ep = 1; ep <= 3; ep++) {
      const cap = `measure_power.phase${ep}`;
      if (!this.hasCapability(cap)) { continue; }
      const cluster = zclNode.endpoints[ep] && zclNode.endpoints[ep].clusters
        && (zclNode.endpoints[ep].clusters.electricalMeasurement
          || zclNode.endpoints[ep].clusters.haElectricalMeasurement
          || zclNode.endpoints[ep].clusters[0x0B04]);
      if (cluster && typeof cluster.on === 'function') {
        try {
          cluster.on('attr.activePower', (v) => {
            // haElectricalMeasurement activePower is in 0.1W units on most
            // Tuya 3-phase meters (Z2M acPower divisor 10)
            this.safeSetCapabilityValue(cap, v / 10).catch(() => {});
          });
          this.log(`[ENERGY-3PH] phase${ep} ZCL listener attached`);
        } catch (e) {
          this.log(`[ENERGY-3PH] phase${ep} listener failed: ${e.message}`);
        }
      }
    }
    this.log('[ENERGY-3PH]  Ready');
  }


  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}
module.exports = EnergyMeter3PhaseDevice;
