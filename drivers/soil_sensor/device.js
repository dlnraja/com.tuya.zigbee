'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

const TuyaUnifiedDevice = require('../../lib/devices/TuyaUnifiedDevice');
const BatteryCalculator = require('../../lib/battery/BatteryCalculator');
const { getAppVersionPrefixed } = require('../../lib/utils/AppVersion');
const { SoilMoistureInference, BatteryInference } = require('../../lib/IntelligentSensorInference');

/**
 * 
 *             SOIL SENSOR - v5.5.317 INTELLIGENT INFERENCE                    
 * 
 *    v5.5.317: INTELLIGENT INFERENCE ENGINE                                   
 *   - Validates moisture readings with temperature correlation                 
 *   - Predicts watering needs based on moisture trends                         
 *   - Smooths erratic sensor readings                                          
 *                                                                               
 *   KNOWN MODELS:                                                               
 *   - TS0601 / _TZE284_oitavov2 : QT-07S Soil moisture sensor                   
 *   - TS0601 / _TZE284_aao3yzhs : Soil sensor variant                           
 *   - TS0601 / _TZE284_hdml1aav : Flower Care Fertilizer sensor (EC)          
 *                                                                               
 *   DP MAPPINGS:
 *   - DP1: temperature / 10 (alt)
 *   - DP2: soil_moisture % (alt, Z2M mapping)
 *   - DP3: soil_moisture %
 *   - DP4: fertilizer_ec
 *   - DP5: temperature / 10
 *   - DP14: battery_state enum (0=low, 1=med, 2=high)
 *   - DP15: battery_percent %
 *   - DP20: EC (Electrical Conductivity) - Z2M DP mapping
 *   - DP22: EC (Fertilizer level) - Z2M DP mapping
 *   - DP101: ambient_humidity %
 *   - DP102: illuminance lux
 *   - DP106: fertilizer_ec (advanced variants)
 *   - DP112: soil_fertility_ec (TZE284 specific)
 */
class SoilSensorDevice extends TuyaUnifiedDevice {

  /** Battery powered */
  get mainsPowered() { return false; }

  get forceActiveTuyaMode() { return true; }

  get hybridModeEnabled() { return true; }

  get isSgabhwa6Variant() {
    const manufacturer = this.getSetting?.('zb_manufacturer_name') || '';
    return manufacturer.toLowerCase() === '_tze284_sgabhwa6';
  }

  // P64.10: Detect ZG-303Z (HOBEIAN) family which uses a different DP map:
  //   DP 1 = water_warning, DP 103 = temperature, DP 105 = humidity_calibration,
  //   DP 107 = soil_moisture, DP 108 = battery, DP 109 = humidity.
  // The legacy Z2M `TS0601_soil` map uses DP 3=moisture, DP 5=temperature, DP 15=battery.
  get isZG303ZVariant() {
    const manufacturer = (this.getSetting?.('zb_manufacturer_name') || '').toLowerCase();
    // MFRs known to use the ZG-303Z DP map: _TZE200_wqashyqo, _TZE284_awepdiwi,
    // _TZE284_ga1maeof, _TZE284_myd45weu, _TZE284_oitavov2, _TZE284_2nhqasjh,
    // _TZE284_aao3yzhs, _TZE284_tgrzpqf4, _TZE284_0ints6wl, _TZE200_npj9bug3.
    const zg303Mfrs = [
      '_tze200_wqashyqo', '_tze284_awepdiwi', '_tze284_ga1maeof',
      '_tze284_myd45weu', '_tze284_oitavov2', '_tze284_2nhqasjh',
      '_tze284_aao3yzhs', '_tze284_tgrzpqf4', '_tze284_0ints6wl',
      '_tze200_npj9bug3', '_tze200_myd45weu', '_tze204_myd45weu',
    ];
    if (zg303Mfrs.includes(manufacturer)) {return true;}
    // vendor name 'HOBEIAN' is a strong hint too
    if (manufacturer === 'hobeian' || manufacturer === 'hobeian zg-303z') {return true;}
    return false;
  }

  /** Capabilities for soil sensors */
  get sensorCapabilities() {
    return [
      'measure_humidity.soil', 
      'measure_temperature', 
      'measure_humidity', 
      'measure_luminance', 
      'measure_battery', 
      'alarm_battery',
      'alarm_water', 
      'measure_ec'
    ];
  }

  /**
   * v5.5.47: Battery configuration 
   */
  get batteryConfig() {
    return {
      chemistry: BatteryCalculator.CHEMISTRY.CR2032,
      algorithm: BatteryCalculator.ALGORITHM.DIRECT,  // DP15 = direct %
      dpId: 15,           // DP15 = battery percentage
      dpIdState: 14,      // DP14 = battery_state enum (0=low, 1=med, 2=high)
      voltageMin: 2.0,
      voltageMax: 3.0,
    };
  }

  /**
   * DP mappings for Soil Sensors
   */
  get dpMappings() {
    return {
      1: { capability: 'measure_temperature', smartDivisor: true },
      2: { capability: 'measure_humidity.soil', divisor: 1 }, // Alt moisture (Z2M DP mapping)
      3: {
        capability: 'measure_humidity.soil',
        transform: (value) => this.isSgabhwa6Variant ? safeDivide(value, 10) : value,
      },
      4: { capability: 'measure_ec', divisor: 1 }, // EC (Fertilizer level)
      5: {
        capability: 'measure_temperature',
        transform: (v) => {
          const num = safeMultiply(v, 1);
          if (num === null) {return null;}
          // Handle various Tuya temperature formats (x10, x100, or raw)
          if (Math.abs(num) > 1000) {return safeDivide(num, 100);}
          if (Math.abs(num) > 100) {return safeDivide(num, 10);}
          return num;
        }
      },
      14: {
        capability: 'measure_battery',
        transform: (v) => ({ 0: 10, 1: 50, 2: 100 }[v] ?? v)
      },
      15: { capability: 'measure_battery', divisor: 1 },
      20: { capability: 'measure_ec', divisor: 1 }, // EC (Electrical Conductivity) - Z2M DP mapping
      22: { capability: 'measure_ec', divisor: 1 }, // EC (Fertilizer level) - Z2M DP mapping
      101: { capability: 'measure_humidity', divisor: 1 },
      102: { capability: 'measure_luminance', divisor: 1 },
      103: { setting: 'report_interval', min: 30, max: 1200 },
      104: { setting: 'soil_calibration', min: -30, max: 30 },
      105: { capability: 'measure_humidity.soil', divisor: 1, transform: (v) => v > 100 ? safeDivide(v, 10) : v },
      106: { capability: 'measure_ec', divisor: 1 },
      107: { setting: 'temperature_calibration', min: -20, max: 20 },
      109: { capability: 'measure_humidity', divisor: 1 },
      110: { setting: 'soil_warning', min: 0, max: 100 },
      111: {
        capability: 'measure_humidity.soil',
        divisor: 1,
        transform: (v) => {
          const mfr = this.getSetting?.('zb_manufacturer_name') || '';
          if (mfr.includes('npj9bug3')) {return v;}
          return v === 1; // Fallback to alarm_water
        }
      },
      112: { capability: 'measure_ec', divisor: 1 }, // Soil Conductivity -> EC
      113: { setting: 'soil_fertility_calibration', min: -1000, max: 1000 },
      114: { setting: 'soil_fertility_warning_setting', min: 0, max: 5000 },
    };
  }

  async onNodeInit({ zclNode }) {
    // v5.5.317: Soil sensors ARE battery-powered - do NOT remove battery capabilities.
    // Only remove if the device is actually mains-powered (some variants may be).
    if (this.mainsPowered) {
      this.log('[SOIL] Mains-powered variant detected, removing battery capabilities');
      await this.removeCapability('measure_battery').catch(() => {});
      await this.removeCapability('alarm_battery').catch(() => {});
    }

    // v5.5.564: Retry init with backoff for pairing failures (e.g. _TZE284_oitavov2)
    let initAttempts = 0;
    const maxInitAttempts = 3;
    while (initAttempts < maxInitAttempts) {
      try {
        await super.onNodeInit({ zclNode });
        break; // Success
      } catch (err) {
        initAttempts++;
        this.log(`[SOIL] Base init attempt ${initAttempts}/${maxInitAttempts} failed: ${err.message}`);
        if (initAttempts < maxInitAttempts) {
          const delay = initAttempts * 1000; // 1s, 2s backoff
          this.log(`[SOIL] Retrying in ${delay}ms...`);
          await new Promise(r => this.homey.setTimeout(r, delay));
        } else {
          this.log('[SOIL] All init attempts exhausted - device may have limited functionality');
        }
      }
    }

    this.log(`[SOIL] Soil Sensor ${getAppVersionPrefixed()} Stabilized`);

    this._soilInference = new SoilMoistureInference(this, {
      maxMoistureJump: 25,
      dryThreshold: 20,
      wetThreshold: 80
    });

    this._initFlowTriggers();

    this._previousMoisture = null;
    this._previousTemperature = null;
    this._previousBattery = null;

    // v5.5.564: Schedule a delayed DP query for battery devices that may not
    // report immediately after pairing (fix for _TZE284_oitavov2 binding issues)
    this.homey.setTimeout(() => {
      if (this._destroyed) {return;}
      this.log('[SOIL] Delayed DP query for battery device stabilization...');
      this.requestAllDPs().catch((e) => {
        this.log('[SOIL] Delayed DP query failed:', e.message);
      });
    }, 5000);
  }

  _updateWaterAlarm() {
    const moisture = this.getCapabilityValue('measure_humidity.soil');
    const threshold = this.getSetting('soil_warning_threshold') || 30;
    if (moisture !== null && this.hasCapability('alarm_water')) {
      const alarm = moisture < threshold;
      this.safeSetCapabilityValue('alarm_water', alarm).catch(() => { });
    }
  }

  _normalizeSoilMoisture(value, dpId = 'unknown') {
    const moisture = Number(value);
    if (!Number.isFinite(moisture)) {
      this.log(`[SOIL] Ignoring non-numeric soil moisture DP${dpId}: ${String(value)}`);
      return null;
    }
    return Math.max(0, Math.min(100, moisture));
  }

  _setAmbientHumidity(dpId, value) {
    const humidity = Number(value);
    if (!Number.isFinite(humidity)) {
      this.log(`[SOIL] Ignoring non-numeric ambient humidity DP${dpId}: ${String(value)}`);
      return;
    }
    if (this.hasCapability('measure_humidity')) {
      this.safeSetCapabilityValue('measure_humidity', Math.max(0, Math.min(100, humidity))).catch(() => { });
    }
  }

  _handleDP(dpId, value) {
    const dp = Number(dpId);
    let parsedValue = value;
    
    if (Buffer.isBuffer(value)) {
      if (value.length === 4) {parsedValue = value.readInt32BE(0);}
      else if (value.length === 2) {parsedValue = value.readInt16BE(0);}
      else if (value.length === 1) {parsedValue = value.readUInt8(0);}
    }

    // Conductivity / EC (DP 4, 20, 22, 106, 112)
    if (dp === 4 || dp === 20 || dp === 22 || dp === 106 || dp === 112) {
      this.log(`[SOIL] EC/Conductivity DP${dp} = ${parsedValue}`);
      this.safeSetCapabilityValue('measure_ec', parseFloat(parsedValue)).catch(() => { });
      this._triggerECFlows(parsedValue);
      return;
    }

    if (dp === 101 || dp === 109) {
      this.log(`[SOIL] Ambient humidity DP${dp} = ${parsedValue}%`);
      this._setAmbientHumidity(dp, parsedValue);
      return;
    }

    // P64.10 FIX: DP 105 is humidity_calibration on ZG-303Z (not moisture).
    // DP 107 is soil_moisture on ZG-303Z — we now also accept it here.
    // This prevents calibration values from firing the moisture flow trigger
    // (which caused "Invalid value" errors in user reports).
    if (dp === 2 || dp === 3 || dp === 107) {
      this.log(`[SOIL] Moisture DP${dp} = ${parsedValue}%`);
      let moisture = parsedValue;
      if (dp === 3 && this.isSgabhwa6Variant) {moisture = safeDivide(moisture, 10);}
      const normalizedMoisture = this._normalizeSoilMoisture(moisture, dp);
      if (normalizedMoisture === null) {return;}

      const targetCap = this.hasCapability('measure_humidity.soil') ? 'measure_humidity.soil' : 'measure_humidity';
      this.safeSetCapabilityValue(targetCap, normalizedMoisture).catch(() => { });
      this._updateWaterAlarm();
      this._triggerMoistureFlows(normalizedMoisture);
      return;
    }

    // P64.10 ADD: ZG-303Z humidity_calibration (DP 105) — apply offset to humidity reading
    // and store in setting; do NOT trigger any flow (calibration is not a moisture event).
    if (dp === 105) {
      this.log(`[SOIL] Humidity calibration DP${dp} = ${parsedValue}`);
      if (this.getSetting) {
        this.setSettings({ humidity_calibration: Number(parsedValue) || 0 }).catch(() => {});
      }
      return;
    }

    // P64.10 ADD: ZG-303Z temperature (DP 103) — raw, divide by 10
    if (dp === 103) {
      let temp = parsedValue;
      if (Math.abs(temp) > 1000) {temp = safeDivide(temp, 100);}
      else if (Math.abs(temp) > 100) {temp = safeDivide(temp, 10);}
      this.log(`[SOIL] Temp DP${dp} = ${temp}°C`);
      this.safeSetCapabilityValue('measure_temperature', parseFloat(temp)).catch(() => { });
      this._triggerTemperatureFlows(temp);
      return;
    }

    // P64.10 ADD: ZG-303Z water_warning (DP 1) — set alarm_water.
    // For ZG-303Z family, DP 1 is water_warning (enum) — NOT temperature.
    // Legacy devices still treat DP 1 as temperature.
    if (dp === 1 && this.isZG303ZVariant) {
      const v = Number(parsedValue);
      this.log(`[SOIL] Water warning DP${dp} = ${v}`);
      if (Number.isFinite(v) && this.hasCapability('alarm_water')) {
        this.safeSetCapabilityValue('alarm_water', v >= 1).catch(() => { });
      }
      return;
    }

    // P64.10 ADD: ZG-303Z battery (DP 108) — read raw %
    if (dp === 108) {
      this.log(`[SOIL] Battery DP${dp} = ${parsedValue}%`);
      const v = Number(parsedValue);
      if (Number.isFinite(v) && this.hasCapability('measure_battery')) {
        this.safeSetCapabilityValue('measure_battery', Math.max(0, Math.min(100, v))).catch(() => { });
      }
      return;
    }

    // P64.10 ADD: ZG-303Z soil_calibration (DP 102), temp_calibration (DP 104),
    // temp_unit (DP 106) — store as settings, do NOT fire flows.
    if (dp === 102 || dp === 104 || dp === 106) {
      const settingName = dp === 102 ? 'soil_calibration'
                        : dp === 104 ? 'temperature_calibration'
                        : 'temperature_unit';
      this.log(`[SOIL] Calibration DP${dp} (${settingName}) = ${parsedValue}`);
      if (this.getSetting) {
        const v = Number(parsedValue);
        if (Number.isFinite(v)) {
          this.setSettings({ [settingName]: v }).catch(() => {});
        }
      }
      return;
    }

    // P64.10 ADD: ZG-303Z soil_warning (DP 110), temp_sampling (DP 111), soil_sampling (DP 112) — settings
    if (dp === 110 || dp === 111 || dp === 112) {
      const settingName = dp === 110 ? 'soil_warning'
                        : dp === 111 ? 'temperature_sampling'
                        : 'soil_sampling';
      this.log(`[SOIL] Setting DP${dp} (${settingName}) = ${parsedValue}`);
      if (this.getSetting) {
        const v = Number(parsedValue);
        if (Number.isFinite(v)) {
          this.setSettings({ [settingName]: v }).catch(() => {});
        }
      }
      return;
    }

    if (dp === 5 || dp === 1) {
      let temp = parsedValue;
      if (Math.abs(temp) > 1000) {temp = safeDivide(temp, 100);}
      else if (Math.abs(temp) > 100) {temp = safeDivide(temp, 10);}
      this.log(`[SOIL] Temp DP${dp} = ${temp}Â°C`);
      this.safeSetCapabilityValue('measure_temperature', parseFloat(temp)).catch(() => { });
      this._triggerTemperatureFlows(temp);
      return;
    }

    super._handleDP(dpId, value);
  }

  _initFlowTriggers() {
    this._flowTriggerMoistureChanged = this._getFlowCardSafe('soil_sensor_moisture_changed');
    this._flowTriggerSoilDry = this._getFlowCardSafe('soil_sensor_soil_dry');
    this._flowTriggerSoilWet = this._getFlowCardSafe('soil_sensor_soil_wet');
    this._flowTriggerECChanged = this._getFlowCardSafe('soil_sensor_ec_changed');
  }

  _getFlowCardSafe(id) {
    try { return this.homey.flow.getDeviceTriggerCard(id); } catch(e) { return null; }
  }

  _triggerMoistureFlows(moisture) {
    const normalizedMoisture = this._normalizeSoilMoisture(moisture, 'flow');
    if (normalizedMoisture === null) {return;}
    if (this._flowTriggerMoistureChanged) {
      this._flowTriggerMoistureChanged.trigger(this, { moisture: normalizedMoisture }).catch(this.error);
    }
    if (this._previousMoisture !== null) {
      if (normalizedMoisture < 30 && this._previousMoisture >= 30 && this._flowTriggerSoilDry) {
        this._flowTriggerSoilDry.trigger(this, {}).catch(this.error);
      }
      if (normalizedMoisture > 70 && this._previousMoisture <= 70 && this._flowTriggerSoilWet) {
        this._flowTriggerSoilWet.trigger(this, {}).catch(this.error);
      }
    }
    this._previousMoisture = normalizedMoisture;
  }

  _triggerTemperatureFlows(temperature) {
    this._previousTemperature = temperature;
  }

  _triggerECFlows(ecValue) {
    if (this._flowTriggerECChanged) {
      this._flowTriggerECChanged.trigger(this, { ec: ecValue }).catch(this.error);
    }
  }

  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself');
    await this.requestAllDPs().catch(() => {});
  }
}

module.exports = SoilSensorDevice;
