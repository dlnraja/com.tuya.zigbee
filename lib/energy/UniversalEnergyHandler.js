'use strict';

/**
 * UniversalEnergyHandler
 * Manages 'Metering' (0x0702) and 'ElectricalMeasurement' (0x0B04) clusters universally.
 * Applies Z2M/ZHA quirks for scaling/divisors and configures auto-reporting.
 */
class UniversalEnergyHandler {
  constructor(device) {
    this.device = device;
    this.zclNode = device.zclNode;
    
    // Default capability multipliers (can be overridden by quirks)
    this.multipliers = {
      measure_power: 1,      // W
      measure_voltage: 1,    // V
      measure_current: 1,    // A
      meter_power: 1         // kWh
    };
    
    // ZHA/Z2M Universal Tuya Quirks
    this._applyUniversalQuirks();
  }

  async init() {
    this.device.log('[ENERGY-UNIFIED] ⚡ Initializing Universal Energy Handler');
    
    await this._setupMetering();
    await this._setupElectricalMeasurement();
    
    // Bind capabilities safely
    this._registerListeners();
  }
  
  _applyUniversalQuirks() {
    const modelId = this.device.getSetting('zb_model_id') || '';
    
    // EWeLink/Sonoff Specifics
    if (modelId === 'CK-BL702-SWP-01(7020)' || this.device.getManufacturerName() === 'eWeLink') {
      this.device.log('[ENERGY-UNIFIED] 🛠️ Applying eWeLink energy quirks');
      this.multipliers.measure_power = 0.1;
      this.multipliers.meter_power = 0.01;
    }
    
    // Tuya Generic Plugs (TS0121, TS011F)
    if (['TS0121', 'TS011F'].includes(modelId)) {
      this.device.log('[ENERGY-UNIFIED] 🛠️ Applying Tuya Plug energy quirks');
      this.multipliers.measure_power = 1;
      this.multipliers.measure_current = 0.001; // mA to A
      this.multipliers.measure_voltage = 0.1;   // dV to V
      this.multipliers.meter_power = 0.01;      // 10Wh to kWh
    }
  }

  async _setupMetering() {
    if (!this.device.hasCapability('meter_power')) return;
    
    const endpoint = this._findEndpoint([0x0702, 'metering']);
    if (!endpoint) return;

    try {
      const cluster = endpoint.clusters.metering;
      
      // Try to read the multipliers from device if not already set by quirk
      try {
        const attrs = await cluster.readAttributes(['multiplier', 'divisor']);
        if (attrs.multiplier && attrs.divisor) {
          const derived = attrs.multiplier / attrs.divisor;
          this.multipliers.meter_power = derived;
          this.device.log(`[ENERGY-UNIFIED] ⚡ Read Metering scaling: ${derived}`);
        }
      } catch (err) {
        this.device.log('[ENERGY-UNIFIED] ⚠️ Could not read Metering scaling, using fallback');
      }

      await cluster.configureReporting({
        attribute: 'currentSummDelivered',
        minimumReportInterval: 5,
        maximumReportInterval: 3600,
        reportableChange: 1
      }).catch(err => this.device.log(`[ENERGY-UNIFIED] ⚠️ Metering reporting config failed: ${err.message}`));
      
    } catch (err) {
      this.device.error('[ENERGY-UNIFIED] Error setting up metering:', err);
    }
  }

  async _setupElectricalMeasurement() {
    const hasPower = this.device.hasCapability('measure_power');
    const hasCurrent = this.device.hasCapability('measure_current');
    const hasVoltage = this.device.hasCapability('measure_voltage');
    
    if (!hasPower && !hasCurrent && !hasVoltage) return;
    
    const endpoint = this._findEndpoint([0x0B04, 'electricalMeasurement']);
    if (!endpoint) return;

    try {
      const cluster = endpoint.clusters.electricalMeasurement;
      
      try {
        const attrs = await cluster.readAttributes(['acPowerMultiplier', 'acPowerDivisor', 'acVoltageMultiplier', 'acVoltageDivisor', 'acCurrentMultiplier', 'acCurrentDivisor']);
        
        if (attrs.acPowerMultiplier && attrs.acPowerDivisor) {
          this.multipliers.measure_power = attrs.acPowerMultiplier / attrs.acPowerDivisor;
        }
        if (attrs.acVoltageMultiplier && attrs.acVoltageDivisor) {
          this.multipliers.measure_voltage = attrs.acVoltageMultiplier / attrs.acVoltageDivisor;
        }
        if (attrs.acCurrentMultiplier && attrs.acCurrentDivisor) {
          this.multipliers.measure_current = attrs.acCurrentMultiplier / attrs.acCurrentDivisor;
        }
        this.device.log(`[ENERGY-UNIFIED] ⚡ Read Electrical scaling: P=${this.multipliers.measure_power}, V=${this.multipliers.measure_voltage}, I=${this.multipliers.measure_current}`);
      } catch (err) {
        this.device.log('[ENERGY-UNIFIED] ⚠️ Could not read Electrical scaling, using fallback');
      }

      const reportPayload = [];
      if (hasPower) reportPayload.push({ attribute: 'activePower', minimumReportInterval: 5, maximumReportInterval: 3600, reportableChange: 10 });
      if (hasVoltage) reportPayload.push({ attribute: 'rmsVoltage', minimumReportInterval: 5, maximumReportInterval: 3600, reportableChange: 5 });
      if (hasCurrent) reportPayload.push({ attribute: 'rmsCurrent', minimumReportInterval: 5, maximumReportInterval: 3600, reportableChange: 50 });

      if (reportPayload.length > 0) {
        for (const payload of reportPayload) {
            await cluster.configureReporting(payload).catch(err => this.device.log(`[ENERGY-UNIFIED] ⚠️ Electrical reporting config failed for ${payload.attribute}: ${err.message}`));
        }
      }
    } catch (err) {
      this.device.error('[ENERGY-UNIFIED] Error setting up electrical measurement:', err);
    }
  }

  _registerListeners() {
    // 1. Metering (kWh)
    const meterEp = this._findEndpoint([0x0702, 'metering']);
    if (meterEp && this.device.hasCapability('meter_power')) {
      meterEp.clusters.metering.on('attr.currentSummDelivered', (value) => {
        if (value === null || value === undefined) return;
        const normalized = value * this.multipliers.meter_power;
        this.device.setCapabilityValue('meter_power', Number(normalized.toFixed(3))).catch(() => {});
      });
    }

    // 2. Electrical Measurement (W, V, A)
    const electricalEp = this._findEndpoint([0x0B04, 'electricalMeasurement']);
    if (electricalEp) {
      const cluster = electricalEp.clusters.electricalMeasurement;
      
      if (this.device.hasCapability('measure_power')) {
        cluster.on('attr.activePower', (value) => {
          if (value === null || value === undefined) return;
          const normalized = Math.round(value * this.multipliers.measure_power);
          this.device.setCapabilityValue('measure_power', normalized).catch(() => {});
        });
      }

      if (this.device.hasCapability('measure_voltage')) {
        cluster.on('attr.rmsVoltage', (value) => {
          if (value === null || value === undefined) return;
          const normalized = value * this.multipliers.measure_voltage;
          this.device.setCapabilityValue('measure_voltage', Number(normalized.toFixed(1))).catch(() => {});
        });
      }

      if (this.device.hasCapability('measure_current')) {
        cluster.on('attr.rmsCurrent', (value) => {
          if (value === null || value === undefined) return;
          const normalized = value * this.multipliers.measure_current;
          this.device.setCapabilityValue('measure_current', Number(normalized.toFixed(3))).catch(() => {});
        });
      }
    }
  }
  
  _findEndpoint(clusterKeys) {
    if (!this.zclNode?.endpoints) return null;
    const keys = Array.isArray(clusterKeys) ? clusterKeys : [clusterKeys];
    for (const epKey of Object.keys(this.zclNode.endpoints)) {
      const ep = this.zclNode.endpoints[epKey];
      if (!ep?.clusters) continue;
      for (const key of keys) {
        if (ep.clusters[key] || ep.clusters[Number(key)] || ep.clusters[String(key)]) {
          return ep;
        }
      }
    }
    return null;
  }
}

module.exports = UniversalEnergyHandler;
