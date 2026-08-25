'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');
const { ClimateInference, BatteryInference } = require('../../lib/IntelligentSensorInference');
const { containsCI } = require('../../lib/utils/CaseInsensitiveMatcher');

const BATTERY_STATE_ENUM = { 0: 10, 1: 50, 2: 100 };

/**
 * Climate Sensor Device - v8.0.0 MODERNIZED
 * High-precision temperature and humidity tracking with psychrometric validation.
 */
class ClimateSensorDevice extends UnifiedSensorBase {

  async onNodeInit({ zclNode }) {
    this.log('[CLIMATE] 🚀 v8.0.0 Modernizing...');

    // Initialize specialized climate inference (psychrometric validation)
    this._climateInference = new ClimateInference(this, {
      maxTempJump: 5,
      maxHumidityJump: 15,
      minTemp: -40,
      maxTemp: 100
    });

    this._batteryInference = new BatteryInference(this);

    // WHY(P2250): HOBEIAN ZG-227Z/ZL is pure ZCL climate — brand also owns soil/presence
    // couples; log couple so diags never confuse with ZG-303Z / ZG-204*.
    try {
      const mfr = this._manufacturerName();
      const pid = this.getSetting?.('zb_model_id')
        || this.getStoreValue?.('modelId')
        || this.getData?.()?.productId
        || '';
      if (containsCI(mfr, 'HOBEIAN') || /ZG-227/i.test(String(pid))) {
        this.log(`[CLIMATE-HOBEIAN] couple mfr=${mfr || '?'} pid=${pid || '?'} (ZCL temp/humidity; hybrid wrappers still active)`);
      }
    } catch (_e) { /* non-fatal */ }

    // Parent handles standard sensor logic and v8 discovery initialization
    // (IntelligentProtocolDetect HYBRID + HomeyCompensationLayer parallel RX/TX)
    await super.onNodeInit({ zclNode });

    this.log('[CLIMATE] ✅ Ready');
  }

  _manufacturerName() {
    try {
      const MfrHelper = require('../../lib/helpers/ManufacturerNameHelper');
      const m = MfrHelper.getManufacturerName(this);
      if (m) {return m;}
    } catch (_) { /* optional */ }
    return this.getManufacturerName?.()
      || this.getSetting?.('zb_manufacturer_name')
      || this.getStoreValue?.('manufacturerName')
      || '';
  }

  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery', 'measure_voltage', 'measure_luminance'];
  }

  get dpMappings() {
    const mfr = this._manufacturerName();
    if (containsCI(mfr, 'AAEASOLL')) {
      return {
        2: { capability: 'measure_luminance', divisor: 1 },
        3: { capability: 'measure_battery', divisor: 1 },
        4: { capability: 'measure_battery', divisor: 1 }
      };
    }

    // ZT08 / _TZE284_hodyryli (GH #513): Z2M datapoints
    // DP1 temp×10, DP2 humidity raw 0-100, DP3 battery_state 0/1/2 → 10/50/100, DP38 probe×10
    if (containsCI(mfr, 'hodyryli')) {
      return {
        1: { capability: 'measure_temperature', smartDivisor: true, useInference: true },
        2: { capability: 'measure_humidity', smartDivisor: true, useInference: true },
        3: { capability: 'measure_battery', transform: (v) => BATTERY_STATE_ENUM[Number(v)] ?? v },
        38: { capability: 'measure_temperature.probe', smartDivisor: true, dynamicAdd: true }
      };
    }

    return {
      1: { capability: 'measure_temperature', smartDivisor: true, useInference: true },
      2: { capability: 'measure_humidity', smartDivisor: true, useInference: true },
      3: { capability: 'measure_battery', divisor: 1 },
      4: { capability: 'measure_battery', divisor: 1 },
      5: { capability: 'measure_luminance', divisor: 1 },
      12: { capability: 'measure_luminance', divisor: 1 },
      38: { capability: 'measure_temperature.probe', smartDivisor: true, dynamicAdd: true }
    };
  }

  /**
   * Main DP handler using v8 libraries
   */
  onTuyaDP(dpId, value, dpType) {
    this.log(`[CLIMATE] 📥 DP${dpId} = ${value}`);

    const mapping = this.dpMappings[dpId];
    if (mapping) {
      // Dynamic capability addition (e.g. measure_temperature.probe for DP38
      // external probe, ZY-ZTH03PRO/ZT08) — mirrors UnifiedSensorBase handler
      // which this method overrides.
      if (mapping.dynamicAdd && mapping.capability && !this.hasCapability(mapping.capability)) {
        this.addCapability(mapping.capability)
          .then(() => this.log(`[CLIMATE] ✨ DYNAMIC ADD: ${mapping.capability} (from DP${dpId})`))
          .catch((e) => this.log(`[CLIMATE] ⚠️ Could not add ${mapping.capability}: ${e.message}`));
      }
      let val;
      if (typeof mapping.transform === 'function') {
        val = mapping.transform(value);
      } else if (mapping.smartDivisor === true) {
        const { smartParse } = require('../../lib/managers/SmartDivisorManager');
        val = smartParse(value, dpId, {
          manufacturerName: this.getSetting('zb_manufacturer_name') || this._manufacturerName() || '',
          capability: mapping.capability,
          deviceId: this.getData()?.id || '',
        });
      } else {
        val = value / (mapping.divisor || 1);
      }

      if (mapping.capability === 'measure_temperature' || mapping.capability === 'measure_temperature.probe') {
        val = this._climateInference.validateTemperature(val);
      } else if (mapping.capability === 'measure_humidity') {
        val = this._climateInference.validateHumidity(val);
      } else if (mapping.capability === 'measure_battery') {
        val = this._batteryInference.validateBattery(val);
      }

      if (val !== null) {
        return this.safeSetCapabilityValue(mapping.capability, val).catch(() => {});
      }
      return;
    }

    // Fallback to heuristic discovery
    return super.onTuyaDP(dpId, value, dpType);
  }
}

module.exports = ClimateSensorDevice;
