/**
 * SmartEnergyManager v5.7.48
 * Intelligent energy measurement detection for all Tuya Zigbee devices
 * Auto-detects: voltage, current, power, energy based on available DPs/clusters
 */
'use strict';

const AdaptiveDataParser = require('../utils/AdaptiveDataParser');

// Energy DPs with their transforms
const ENERGY_DPS = {
  // Standard plugs/switches
  17: { cap: 'measure_power', div: 10, desc: 'Power W' },
  18: { cap: 'measure_current', div: 1000, desc: 'Current A' },
  19: { cap: 'measure_voltage', div: 10, desc: 'Voltage V' },
  20: { cap: 'meter_power', div: 100, desc: 'Energy kWh' },
  
  // TS0601 variants
  101: { cap: 'measure_voltage', div: 10, desc: 'Voltage V' },
  102: { cap: 'measure_current', div: 1000, desc: 'Current mA' },
  103: { cap: 'measure_power', div: 10, desc: 'Power W' },
  104: { cap: 'meter_power', div: 100, desc: 'Energy kWh' },
  
  // 3-phase meters (Phase A)
  105: { cap: 'measure_voltage', div: 10, desc: 'Phase A Voltage' },
  106: { cap: 'measure_current', div: 1000, desc: 'Phase A Current' },
  107: { cap: 'measure_power', div: 1, desc: 'Phase A Power' },
  
  // Alternative DPs
  112: { cap: 'measure_power', div: 10, desc: 'Alt Power' },
  113: { cap: 'measure_current', div: 1000, desc: 'Alt Current' },
  114: { cap: 'measure_voltage', div: 10, desc: 'Alt Voltage' },
  115: { cap: 'meter_power', div: 100, desc: 'Alt Energy' },
  
  // Some devices use these
  121: { cap: 'measure_power', div: 1, desc: 'Power W direct' },
  122: { cap: 'meter_power', div: 1000, desc: 'Energy Wh' },
};

class SmartEnergyManager {
  constructor(device) {
    this.device = device;
    this._detectedCaps = new Set();
    this._divisorCache = {};
  }

  async init() {
    await this._setupZCLListeners();
    this.device.log('[ENERGY] ⚡ SmartEnergyManager ready');
  }

  async _setupZCLListeners() {
    try {
      // Electrical Measurement cluster (0x0B04)
      const em = this.device.zclNode?.endpoints?.[1]?.clusters?.electricalMeasurement;
      if (em?.on) {
        em.on('attr.activePower', (v) => this._setEnergy('measure_power', v / 10));
        em.on('attr.rmsCurrent', (v) => this._setEnergy('measure_current', v / 1000));
        em.on('attr.rmsVoltage', (v) => this._setEnergy('measure_voltage', v / 10));
      }

      // Metering cluster (0x0702)
      const meter = this.device.zclNode?.endpoints?.[1]?.clusters?.metering;
      if (meter?.on) {
        meter.on('attr.currentSummationDelivered', (v) => this._setEnergy('meter_power', v / 1000));
        meter.on('attr.instantaneousDemand', (v) => this._setEnergy('measure_power', v));
      }
    } catch (e) {}
  }

  async handleDP(dpId, value) {
    const config = ENERGY_DPS[dpId];
    if (!config) {return false;}

    let transformed = value;
    if (config.cap === 'measure_voltage') {
      transformed = AdaptiveDataParser.toVoltage(value);
    } else if (config.cap === 'measure_power') {
      transformed = AdaptiveDataParser.toPower(value);
    } else if (config.cap === 'measure_current') {
      transformed = AdaptiveDataParser.toCurrent(value);
    } else {
      transformed = value / config.div;
    }
    
    await this._setEnergy(config.cap, transformed);
    return true;
  }

  async _setEnergy(capability, value) {
    if (value === null || value === undefined || isNaN(value)) {return;}
    value = Math.round(value * 100) / 100;

    if (!this.device.hasCapability(capability)) {
      await this.device.addCapability(capability).catch(() => {});
      this._detectedCaps.add(capability);
      this.device.log(`[ENERGY] ✅ Added ${capability}`);
    }

    await this.device.setCapabilityValue(capability, value).catch(() => {});
  }

  getDetectedCapabilities() {
    return Array.from(this._detectedCaps);
  }
}

module.exports = SmartEnergyManager;
