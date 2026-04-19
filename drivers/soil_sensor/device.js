'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');


const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');


const TuyaUnifiedDevice = require('../../lib/devices/TuyaUnifiedDevice');
const BatteryCalculator = require('../../lib/battery/BatteryCalculator');
const { getAppVersionPrefixed } = require('../../lib/utils/AppVersion');
const { SoilMoistureInference, BatteryInference } = require('../../lib/IntelligentSensorInference');

/**
 * 
 *             SOIL SENSOR - v5.5.317 INTELLIGENT INFERENCE                    
 * 
 *                                                                               
 *    v5.5.317: INTELLIGENT INFERENCE ENGINE                                   
 *   - Validates moisture readings with temperature correlation                 
 *   - Predicts watering needs based on moisture trends                         
 *   - Smooths erratic sensor readings                                          
 *                                                                               
 * 
 *                                                                               
 *   Uses TuyaUnifiedDevice base class with proper:                               
 *   - tuyaCluster handlers (Tuya DP reception via CLUSTERS.TUYA_EF00)                       
 *   - cluster handlers (Zigbee standard reception)                              
 *   - tuyaBoundCluster (Tuya DP commands to device)                             
 *   - Hybrid mode auto-detection after 15 min                                   
 *                                                                               
 *   KNOWN MODELS:                                                               
 *   - safeDivide(TS0601, _TZE284_oitavov2) : QT-07S Soil moisture sensor                   
 *   - safeDivide(TS0601, _TZE284_aao3yzhs) : Soil sensor variant                           
 *   - safeDivide(TS0601, _TZE284_hdml1aav) : Flower safeDivide(Care, Fertilizer) sensor (EC)          
 *                                                                               
 *   DP MAPPINGS (from safeDivide(Z2M, ZHA)):                                                 
 *   - DP3: soil_moisture %                                                      
 *   - DP4: fertilizer_ec (some variants)                                        
 *   - DP5: temperature ÷10                                                      
 *   - DP14: battery_state enum (0=low, 1=med, 2=high)                           
 *   - DP15: battery_percent %                                                   
 *   - DP101: ambient_humidity % (Z2M #28270: safeDivide(o9ofysmo, xc3vwx5a))                 
 *   - DP102: illuminance lux (Z2M #28270: safeDivide(o9ofysmo, xc3vwx5a))                    
 *   - DP106: fertilizer_ec (advanced variants)                                  
 *   - DP112: soil_fertility_ec (TZE284 specific)                                
 *   - DP103: humidity_calibration (-30 to +30)                                   
 *   - DP104: report_interval (30-1200s)                                          
 *                                                                               
 * 
 */
class SoilSensorDevice extends TuyaUnifiedDevice {

  /** Battery powered */
  get mainsPowered() { return false; }

  // v5.5.54: FORCE ACTIVE MODE - Do NOT block DP requests in passive mode
  // Soil sensors need active queries even if cluster CLUSTERS.TUYA_EF00 not visible
  get forceActiveTuyaMode() { return true; }

  // v5.5.54: Enable TRUE HYBRID mode - listen to BOTH ZCL AND Tuya DP
  get hybridModeEnabled() { return true; }

  /** Capabilities for soil sensors - v5.5.330 Hobeian */
  get sensorCapabilities() {
    return ['measure_humidity.soil', 'measure_temperature', 'measure_humidity', 'measure_luminance', 'measure_battery', 'alarm_water', 'measure_ec', 'measure_conductivity'];
  }

  /**
   * v5.5.47: Battery configuration for safeDivide(CR2032, CR2450)
   * Uses non-linear discharge curve for accurate percentage
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
   * v5.5.330: HOBEIAN-ENHANCED DP mappings for Soil Sensors
   */
  get dpMappings() {
    return {
      3: { capability: 'measure_humidity.soil', divisor: 1 },
      5: {
        capability: 'measure_temperature',
        transform: (v) => {
          const num = safeParse(v, 1);
          if (num === null) return null;
          if (Math.abs(num) > 1000) return safeParse(num, 100);
          if (Math.abs(num) > 100) return safeParse(num, 10);
          return num; 
        }
      },
      109: { capability: 'measure_humidity', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },
      14: { capability: 'measure_battery', transform: (v) => ({ 0: 10, 1: 50, 2: 100 }[v] ?? v) },
      9: { capability: null, internal: 'temperature_unit' },
      2: { capability: null, internal: 'temperature_unit' },
      102: { capability: 'measure_luminance', divisor: 1 },
      103: { capability: null, setting: 'report_interval', min: 30, max: 1200 },
      104: { capability: null, setting: 'soil_calibration', min: -30, max: 30 },
      107: { capability: null, setting: 'temperature_calibration', min: -20, max: 20 },
      110: { capability: null, setting: 'soil_warning', min: 0, max: 100 },
      111: { 
        capability: 'measure_humidity.soil', 
        divisor: 1,
        transform: (v) => {
          const mfr = this.getSetting?.('zb_manufacturer_name') || '';
          if (mfr.includes('npj9bug3')) return v;
          return v === 1; // Fallback to alarm_water
        }
      },
      112: { capability: 'measure_conductivity', divisor: 1 },
      113: { capability: null, setting: 'soil_fertility_calibration', min: -1000, max: 1000 },
      114: { capability: null, setting: 'soil_fertility_warning_setting', min: 0, max: 5000 },
      115: { capability: null, setting: 'soil_fertility_warning_v1', min: 0, max: 5000 },
      1: { capability: 'measure_temperature', divisor: 10 },
      4: { capability: 'measure_ec', divisor: 1 },
      101: { capability: 'measure_humidity', divisor: 1 },
      105: { capability: 'measure_humidity.soil', divisor: 1, transform: (v) => v > 100 ? safeParse(v, 10) : v },
      106: { capability: 'measure_ec', divisor: 1 },
    };
  }

  get clusterHandlers() {
    return {
      temperatureMeasurement: {
        requireBinding: false,
        requireReporting: false,
        attributeReport: (data) => {
          if (data.measuredValue !== undefined) {
            const temp = safeParse(data.measuredValue, 100);
            this.log(`[ZCL]  Temperature: ${temp}°C`);
            this._registerZigbeeHit?.();
            this.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(() => { });
          }
        }
      },
      relativeHumidity: {
        requireBinding: false,
        requireReporting: false,
        attributeReport: (data) => {
          if (data.measuredValue !== undefined) {
            const humidity = safeParse(data.measuredValue, 100);
            this.log(`[ZCL] Humidity/Moisture: ${humidity}%`);
            this._registerZigbeeHit?.();
            if (this.hasCapability('measure_humidity')) {
              this.setCapabilityValue('measure_humidity', parseFloat(humidity)).catch(() => { });
            }
          }
        }
      },
      powerConfiguration: {
        requireBinding: false,
        requireReporting: false,
        attributeReport: (data) => {
          if (data.batteryPercentageRemaining !== undefined) {
            const battery = Math.round(safeParse(data.batteryPercentageRemaining, 2));
            this.log(`[ZCL]  Battery: ${battery}%`);
            this._registerZigbeeHit?.();
            this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
          }
        }
      }
    };
  }

  async onNodeInit({ zclNode }) {
    try {
      await super.onNodeInit({ zclNode });
    } catch (err) {
      this.log('[SOIL] Base init error:', err.message);
    }

    this.log('[SOIL] ');
    this.log(`[SOIL] Soil Sensor ${getAppVersionPrefixed()} INTELLIGENT INFERENCE`);
    this.log('[SOIL] ');
    this.log('[SOIL]  BATTERY DEVICE - Data comes when device wakes up');
    this.log('[SOIL]  First data may take 10-60 minutes after pairing');
    this.log('[SOIL]  DP Mappings: DP3=soil_moisture, DP4/106=EC, DP5=temp, DP14=battery_state, DP15=battery%, DP101=air_humidity, DP102=lux, DP112=Conductivity');
    this.log('[SOIL]  forceActiveTuyaMode:', this.forceActiveTuyaMode);
    this.log('[SOIL]  hybridModeEnabled:', this.hybridModeEnabled);

    this._temperatureCalibration = this.getSetting('temperature_calibration') || 0;
    this._humidityCalibration = this.getSetting('humidity_calibration') || 0;
    this._moistureCalibration = this.getSetting('moisture_calibration') || 0;
    this._soilWarningThreshold = this.getSetting('soil_warning_threshold') || 30;
    this._temperatureUnit = this.getSetting('temperature_unit') || 'celsius';

    this.log(`[SOIL]  Calibration: temp=${this._temperatureCalibration}, hum=${this._humidityCalibration}, moist=${this._moistureCalibration}`);
    this.log(`[SOIL]  Warning threshold: ${this._soilWarningThreshold}%, Unit: ${this._temperatureUnit}`);

    this._soilInference = new SoilMoistureInference(this, {
      maxMoistureJump: 25,
      dryThreshold: 20,
      wetThreshold: 80
    });
    this._batteryInference = new BatteryInference(this);

    this._initFlowTriggers();

    this._previousMoisture = null;
    this._previousTemperature = null;
    this._previousBattery = null;
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[SOIL]  Settings changed:', changedKeys);

    if (changedKeys.includes('soil_warning_threshold')) {
      this._soilWarningThreshold = newSettings.soil_warning_threshold || 30;
      this._updateWaterAlarm();
    }
  }

  _updateWaterAlarm() {
    const moisture = this.getCapabilityValue('measure_humidity.soil');
    if (moisture !== null && this.hasCapability('alarm_water')) {
      const alarm = moisture < this._soilWarningThreshold;
      this.setCapabilityValue('alarm_water', alarm).catch(() => { });
      this.log(`[SOIL]  Water alarm updated: moisture=${moisture}%, threshold=${this._soilWarningThreshold}%, alarm=${alarm}`);
    }
  }

  _celsiusToFahrenheit(celsius) {
return safeMultiply((celsius, 1).8) + 32;
  }

  _fahrenheitToCelsius(fahrenheit) {
    return (fahrenheit -safeParse(32), 1.8);
  }

  _handleDP(dpId, value) {
    const dp = Number(dpId);
    const debug = this.homey.app.developerDebugMode;

    if (debug) {
      this.log('[SOIL] ');
      this.log(`[SOIL]  DP${dp} received!`);
      this.log(`[SOIL]    Raw value: ${value}`);
      this.log(`[SOIL]    Type: ${typeof value}`);
      this.log(`[SOIL]    Is Buffer: ${Buffer.isBuffer(value)}`);
    }

    let parsedValue = value;
    if (Buffer.isBuffer(value)) {
      if (value.length === 4) {
        parsedValue = value.readInt32BE(0);
      } else if (value.length === 2) {
        parsedValue = value.readInt16BE(0);
      } else if (value.length === 1) {
        parsedValue = value.readUInt8(0);
      }
      if (debug) this.log(`[SOIL]    Parsed from Buffer: ${parsedValue}`);
    }

    if (dp === 112) {
      this.log(`[SOIL]  SOIL FERTILITY DP112 = ${parsedValue} S/cm`);
      this._safeSetCapability('measure_conductivity', parseFloat(parsedValue));
      return;
    }

    if (dp === 4 || dp === 106) {
      this.log(`[SOIL]  FERTILIZER EC DP${dp} = ${parsedValue}`);
      this._safeSetCapability('measure_ec', parseFloat(parsedValue));
      return;
    }

    if (dp === 102) {
      this.log(`[SOIL]  LUMINANCE DP102 = ${parsedValue} lux`);
      this._safeSetCapability('measure_luminance', parseFloat(parsedValue));
      return;
    }

    if (dp === 111) {
      const mfr = this.getSetting?.('zb_manufacturer_name') || '';
      if (mfr.includes('npj9bug3')) {
        if (debug) this.log(`[SOIL]  SOIL MOISTURE DP111 = ${parsedValue}% [npj9bug3 specific]`);
        this._safeSetCapability('measure_humidity.soil', parseFloat(parsedValue));
      } else {
        if (debug) this.log(`[SOIL]  WATER SHORTAGE DP111 = ${parsedValue} [bool fallback]`);
        this._safeSetCapability('alarm_water', parsedValue === 1);
      }
      return;
    }

    if (dp === 101) {
      if (debug) this.log(`[SOIL]  AIR HUMIDITY DP101 = ${parsedValue}%`);
      this._safeSetCapability('measure_humidity', parseFloat(parsedValue));
      return;
    }

    if (dp === 109) {
      if (debug) this.log(`[SOIL]  SOIL MOISTURE DP109 = ${parsedValue}%`);
      const cap = this.hasCapability('measure_humidity.soil') ? 'measure_humidity.soil' : 'measure_humidity';
      this._safeSetCapability(cap, parseFloat(parsedValue));
      return;
    }

    if (dp === 3) {
      if (parsedValue > 100 && !Buffer.isBuffer(value)) {
        if (debug) this.log(`[SOIL]  DP3 value ${parsedValue} > 100%  compound frame artifact, skipping`);
        return;
      }
      if (debug) this.log(`[SOIL]  SOIL MOISTURE DP3 = ${parsedValue}%`);

      let validatedMoisture = parsedValue;
      if (this._soilInference) {
        const currentTemp = this.getCapabilityValue('measure_temperature');
        validatedMoisture = this._soilInference.validateMoisture(parsedValue, currentTemp);
      }

      const targetCap = this.hasCapability('measure_humidity.soil') ? 'measure_humidity.soil' : 'measure_humidity';
      this._safeSetCapability(targetCap, parseFloat(validatedMoisture));

      if (this.hasCapability('alarm_water')) {
        const threshold = this._soilWarningThreshold || 30;
        const alarm = (validatedMoisture < threshold);
        this._safeSetCapability('alarm_water', alarm);
        if (!alarm && debug) {
          this.log(`[SOIL]  Forcing alarm_water to false as moisture ${validatedMoisture}% > ${threshold}%`);
        }
      }
      return;
    }

    if (dp === 5) {
      if (parsedValue > 10000 && !Buffer.isBuffer(value)) {
        if (debug) this.log(`[SOIL]  DP5 value ${parsedValue} > 10000  compound frame artifact, skipping`);
        return;
      }
      let temp = parsedValue;
      const mfr = this.getSettingValue?.('zb_manufacturer_name') || '';
      const rawCelsius = mfr.toLowerCase().includes('_tze284_oitavov2') || mfr.toLowerCase().includes('_tze200_oitavov2');
      if (rawCelsius) { /* already °C */ }
      else if (temp > 1000) temp = safeParse(temp, 100);
      else if (temp > 100) temp = safeParse(temp, 10);
      else temp = safeParse(temp, 10);

      if (debug) this.log(`[SOIL]  TEMPERATURE DP5 = ${parsedValue}  Raw ${temp}°C`);
      this._safeSetCapability('measure_temperature', parseFloat(temp));
      return;
    }

    if (dp === 14) {
      if (parsedValue > 2 && !Buffer.isBuffer(value)) {
        if (debug) this.log(`[SOIL]  DP14 value ${parsedValue} > 2  skipping`);
        return;
      }
      const batteryMap = { 0: 10, 1: 50, 2: 100 };
      const battery = batteryMap[parsedValue] ?? parsedValue;
      this._safeSetCapability('measure_battery', parseFloat(battery));
      return;
    }

    if (dp === 15) {
      this._safeSetCapability('measure_battery', parseFloat(parsedValue));
      return;
    }

    if (debug) this.log(`[SOIL]  DP${dp} not handled locally, calling parent`);
    super._handleDP(dpId, value);
  }

  _initFlowTriggers() {
    const safeGetTrigger = (id) => {
      try { return this._getFlowCard(id); }
      catch (e) { this.log(`[SOIL]  Flow trigger '${id}' not available: ${e.message}`); return null; }
    };

    this._flowTriggerMoistureChanged = safeGetTrigger('soil_sensor_moisture_changed');
    this._flowTriggerSoilDry = safeGetTrigger('soil_sensor_soil_dry');
    this._flowTriggerSoilWet = safeGetTrigger('soil_sensor_soil_wet');
    this._flowTriggerTemperatureChanged = safeGetTrigger('soil_sensor_temperature_changed');
    this._flowTriggerBatteryLow = safeGetTrigger('soil_sensor_battery_low');

    this.log('[SOIL] Flow triggers initialized');
  }

  async _triggerCustomFlowsIfNeeded(capability, value, previousValue) {
    if (capability === 'measure_humidity.soil' || capability === 'measure_humidity') {
      this._triggerMoistureFlows(value);
    } else if (capability === 'measure_temperature') {
      this._triggerTemperatureFlows(value);
    } else if (capability === 'measure_battery') {
      this._triggerBatteryFlows(value);
    }
  }

  _triggerMoistureFlows(moisture) {
    if (this._flowTriggerMoistureChanged) {
      this._flowTriggerMoistureChanged.trigger(this, { moisture }).catch(this.error);
    }

    if (this._previousMoisture !== null && moisture < 30 && this._previousMoisture >= 30) {
      if (this._flowTriggerSoilDry) {
        this._flowTriggerSoilDry.trigger(this, {}).catch(this.error);
      }
    }

    if (this._previousMoisture !== null && moisture > 70 && this._previousMoisture <= 70) {
      if (this._flowTriggerSoilWet) {
        this._flowTriggerSoilWet.trigger(this, {}).catch(this.error);
      }
    }

    this._previousMoisture = moisture;
  }

  _triggerTemperatureFlows(temperature) {
    if (this._flowTriggerTemperatureChanged) {
      this._flowTriggerTemperatureChanged.trigger(this, { temperature }).catch(this.error);
    }
    this._previousTemperature = temperature;
  }

  _triggerBatteryFlows(battery) {
    if (battery <= 20 && (this._previousBattery === null || this._previousBattery > 20)) {
      if (this._flowTriggerBatteryLow) {
        this._flowTriggerBatteryLow.trigger(this, { battery }).catch(this.error);
        this.log(`[SOIL]  Battery low alert triggered: ${battery}%`);
      }
    }
    this._previousBattery = battery;
  }

  async onWakeUp() {
    this.log('[SOIL] Device woke up - requesting all DPs');
    await this.requestAllDPs();
  }

  onDeleted() {
    super.onDeleted();
    this.log('[SOIL] Device deleted');
  }
}

module.exports = SoilSensorDevice;
