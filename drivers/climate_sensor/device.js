'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');
const { ClimateInference, BatteryInference } = require('../../lib/IntelligentSensorInference');
const { containsCI } = require('../../lib/utils/CaseInsensitiveMatcher');

const BATTERY_STATE_ENUM = { 0: 10, 1: 50, 2: 100 };

/**
 * Climate Sensor Device - v8.0.0 MODERNIZED + P2631 Bastien eWeLink TH
 * High-precision temperature and humidity tracking with psychrometric validation.
 */
class ClimateSensorDevice extends UnifiedSensorBase {

  /**
   * WHY(P2631): Bastien eWeLink CK-TLSR8656-SS5-01(7014) is ZCL TH only
   * (clusters 0/1/3/4/32/1026/1029/FC11) — never EF00 TX, never phantom button.
   */
  getDeviceProfile() {
    const base = (typeof super.getDeviceProfile === 'function' && super.getDeviceProfile()) || {};
    let mfr = '';
    let pid = '';
    try {
      mfr = this._manufacturerName?.() || this.getSetting?.('zb_manufacturer_name') || '';
      pid = this.getSetting?.('zb_model_id') || this.getData?.()?.productId || '';
    } catch (_e) { /* soft */ }
    const eweTh = /ewelink/i.test(String(mfr)) || /CK-TLSR8656-SS5-0[12]\(7014\)/i.test(String(pid));
    if (!eweTh) return base;
    return Object.assign({}, base, {
      noEf00: true,
      skipEf00Tx: true,
      protocol: 'zcl_th',
      zclClusters: [0, 1, 3, 4, 32, 1026, 1029, 64529],
      stripPhantomButton: true,
    });
  }

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
    // WHY(P2622): eWeLink+CK-TLSR8656-SS5-01(7014) is ZCL sleepy TH (not virtual socket).
    try {
      const mfr = this._manufacturerName();
      const pid = this.getSetting?.('zb_model_id')
        || this.getSetting?.('zb_product_id')
        || this.getStoreValue?.('modelId')
        || this.getData?.()?.productId
        || '';
      if (containsCI(mfr, 'HOBEIAN') || /ZG-227/i.test(String(pid))) {
        this.log(`[CLIMATE-HOBEIAN] couple mfr=${mfr || '?'} pid=${pid || '?'} (ZCL temp/humidity; hybrid wrappers still active)`);
      }
      if (containsCI(mfr, 'eWeLink') || /CK-TLSR8656-SS5-0[12]\(7014\)/i.test(String(pid))) {
        this.log(`[CLIMATE-EWELINK] couple mfr=${mfr || '?'} pid=${pid || '?'} (ZCL 0x0402/0x0405/0x0001 sleepy; never socket)`);
        // WHY(P2631): compose historically had button.1 — strip on eWeLink TH
        try {
          if (this.hasCapability?.('button.1')) {
            await this.removeCapability('button.1').catch(() => {});
            this.log('[CLIMATE-EWELINK] P2631 strip phantom button.1');
          }
          this._skipEf00Tx = true;
          this._noEf00 = true;
        } catch (_e2) { /* soft */ }
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
