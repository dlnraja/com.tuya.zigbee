'use strict';
const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');

class EnergyMeter3PhaseDevice extends UnifiedPlugBase {
  // WHY(P2518): mains DIN meter — never phantom battery / plug onoff
  get mainsPowered() { return true; }

  get plugCapabilities() {
    return [
      'measure_power',
      'meter_power',
      'measure_voltage',
      'measure_current',
      'measure_power.phase_total',
      'measure_power.phase1',
      'measure_power.phase2',
      'measure_power.phase3',
      'meter_power.exported',
    ];
  }

  /**
   * WHY(P2518): Z2M ATMS100133Z / dikb3dp6 3P4W — DP1=energy NOT onoff (plug base wrong).
   * Contre quoi: inheriting UnifiedPlugBase DP1→onoff breaks RX energy for a14rjslz.
   * DP 23: exported kWh ÷100 · DP 29: total W ÷10 · phase scalars 103–115 family
   */
  get dpMappings() {
    const base = super.dpMappings || {};
    // Strip plug-centric DPs that collide with 3-phase meter semantics
    const {
      1: _dropOnOff,
      9: _dropUsb,
      7: _dropLock,
      11: _dropCountdown,
      14: _dropPon,
      121: _dropPonAlt,
      ...rest
    } = base;
    return {
      ...rest,
      // Forward active energy (kWh)
      1: { capability: 'meter_power', smartDivisor: true, defaultDivisor: 100 },
      // Reverse / exported energy
      23: { capability: 'meter_power.exported', divisor: 100 },
      // Total energy alternate (some firmwares)
      24: { capability: 'meter_power', smartDivisor: true, defaultDivisor: 100 },
      // Total active power (W) — primary Homey energy tile
      29: { capability: 'measure_power', divisor: 10 },
      30: { capability: null, internal: 'power_reactive' },
      32: { capability: null, internal: 'ac_frequency', divisor: 100 },
      50: { capability: null, internal: 'power_factor' },
      // Phase A scalars only → primary V/A (avoid B/C thrashing same Homey caps — P2519)
      103: { capability: 'measure_voltage', smartDivisor: true, defaultDivisor: 10 },
      104: { capability: 'measure_current', smartDivisor: true, defaultDivisor: 1000 },
      105: { capability: 'measure_power.phase1', divisor: 1 },
      // Phase B/C power only (no overwrite of primary V/A)
      109: { capability: null, internal: 'voltage_b', divisor: 10 },
      110: { capability: null, internal: 'current_b', divisor: 1000 },
      111: { capability: 'measure_power.phase2', divisor: 1 },
      112: { capability: null, internal: 'voltage_c', divisor: 10 },
      113: { capability: null, internal: 'current_c', divisor: 1000 },
      114: { capability: 'measure_power.phase3', divisor: 1 },
      // Keep plug electrical DPs as fallback for hybrid firmwares
      17: { capability: 'measure_current', smartDivisor: true },
      18: { capability: 'measure_power', smartDivisor: true },
      19: { capability: 'measure_voltage', smartDivisor: true },
      20: { capability: 'meter_power', smartDivisor: true },
    };
  }

  async onNodeInit({ zclNode }) {
    // Strip phantom battery on mains 3-phase DIN meters
    await this.removeCapability('measure_battery').catch(() => {});
    await this.removeCapability('alarm_battery').catch(() => {});

    // --- Attribute Reporting Configuration (ZCL hybrid path) ---
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
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    await super.onNodeInit({ zclNode });

    // v9.0.416 (P92.124): per-phase power via haElectricalMeasurement on
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

  // WHY(P2518): DP29 total W → measure_power + mirror phase_total for 3ph UI
  _handleDP(dpId, rawValue) {
    super._handleDP(dpId, rawValue);
    if (Number(dpId) === 29 && this.hasCapability('measure_power.phase_total')) {
      const watts = this.getCapabilityValue('measure_power');
      if (typeof watts === 'number' && Number.isFinite(watts)) {
        this.safeSetCapabilityValue('measure_power.phase_total', watts).catch(() => {});
      }
    }
  }

  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}
module.exports = EnergyMeter3PhaseDevice;
