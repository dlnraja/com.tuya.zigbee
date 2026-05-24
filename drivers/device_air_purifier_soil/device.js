'use strict';
const { safeDivide, safeParse } = require('../../lib/utils/tuyaUtils.js');


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
 *   - TS0601 / _TZE284_oitavov2 : QT-07S Soil moisture sensor                   
 *   - TS0601 / _TZE284_aao3yzhs : Soil sensor variant                           
 *                                                                               
 *   DP MAPPINGS (from Z2M/ZHA):                                                 
 *   - DP3: soil_moisture %                                                      
 *   - DP5: temperature Ã·10                                                      
 *   - DP14: battery_state enum (0=low, 1=med, 2=high)                           
 *   - DP15: battery_percent %                                                   
 *   - DP101: ambient_humidity % (Z2M #28270: o9ofysmo/xc3vwx5a)                 
 *   - DP102: illuminance lux (Z2M #28270: o9ofysmo/xc3vwx5a)                    
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
    return ['measure_humidity.soil', 'measure_temperature', 'measure_humidity', 'measure_luminance', 'measure_battery', 'alarm_water','measure_ec'];
  }

  /**
   * v5.5.47: Battery configuration for CR2032/CR2450
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
   *
   * Source: Hobeian app (AreAArseth/com.hobeian) + ZHA quirk + Z2M
   * https://github.com/AreAArseth/com.hobeian
   *
   * HOBEIAN ZG-303Z (_TZE200_wqashyqo) uses:
   * - DP3: soil_moisture % (0-100%)
   * - DP5: temperature Ã·10 (Â°C)
   * - DP9: temperature_unit (0=C, 1=F)
   * - DP14: water_warning alarm (0=none, 1=alarm)
   * - DP15: battery_percent %
   * - DP109: air_humidity % (0-100%)
   *
   * QT-07S (_TZE284_oitavov2) uses:
   * - DP2: temperature_unit (0=C, 1=F)
   * - DP3: soil_moisture %
   * - DP5: temperature Ã·10
   * - DP14: battery_state enum (0=low, 1=med, 2=high)
   * - DP15: battery_percent %
   */
  get dpMappings() {
    return {
      // 
      // SOIL MOISTURE - DP3 (main sensor value) - Hobeian ZG-303Z
      // 
      3: { capability: 'measure_humidity.soil', divisor: 1 },

      // 
      // TEMPERATURE - DP5 (soil/ambient temperature)
      // Some devices report Ã—10, others Ã—100 - auto-detect
      // 
      5: {
        capability: 'measure_temperature',
        transform: (v) => {
          // Auto-detect scale: >1000=Ã·100, 100-1000=Ã·10, 100=raw Â°C
          if (Math.abs(v) > 1000) return v * 100;
          if (Math.abs(v) > 100) return safeMultiply(v, 10);
          return v; // Already in Â°C (_TZE284_oitavov2 QT-07S)
        }
      },

      // 
      // AIR HUMIDITY - DP109 (Hobeian ZG-303Z specific)
      // 
      109: { capability: 'measure_humidity', divisor: 1 },

      // 
      // BATTERY - DP15 (percentage)
      // 
      15: { capability: 'measure_battery', divisor: 1 },

      // 
      // DP14: BATTERY STATE (standard Tuya soil sensors per Z2M)
      // Z2M: [14, 'battery_state', tuya.valueConverter.batteryState]
      // Enum: 0=low, 1=medium, 2=high  converted in _handleDP
      // Note: Handled directly in _handleDP for proper battery conversion
      // 
      14: { capability: 'measure_battery', transform: (v) => ({ 0: 10, 1: 50, 2: 100 }[v] ?? v) },

      // 
      // TEMPERATURE UNIT - DP9 (Hobeian) / DP2 (QT-07S )
      // 0=Celsius, 1=Fahrenheit - stored internally, not a capability
      // 
      9: { internal: true, type: 'temperature_unit' },
      2: { internal: true, type: 'temperature_unit' },

      // 
      // v5.5.406: RESEARCH-BASED DPs from Z2M issue #23260, #27501
      // _TZE284_sgabhwa6, _TZE284_oitavov2 variants
      // 
      // v5.9.22: Z2M #28270 - DP102=illuminance for _TZE284_o9ofysmo/_TZE284_xc3vwx5a
      
      102: { capability: 'measure_luminance', divisor: 1 },
      103: { setting: 'report_interval', min: 30, max: 1200 },
      104: { setting: 'soil_calibration', min: -30, max: 30 },
      107: { setting: 'temperature_calibration', min: -20, max: 20 },
      110: { setting: 'soil_warning', min: 0, max: 100 },
      111: { 
        capability: 'measure_humidity.soil', 
        divisor: 1,
        // v6.3.1: _TZE200_npj9bug3 uses DP 111 for moisture (%). 
        // For other devices, DP 111 is alarm_water (bool).
        transform: (v) => {
          const mfr = this.getSetting?.('zb_manufacturer_name') || '';
          if (mfr.includes('npj9bug3')) return v;
          return v === 1; // Fallback to alarm_water
        }
      },
      112: { capability: 'measure_conductivity', divisor: 1 }, // soil fertility uS/cm
      113: { setting: 'soil_fertility_calibration', min: -1000, max: 1000 },
      114: { setting: 'soil_fertility_warning_setting', min: 0, max: 5000 },
      115: { setting: 'soil_fertility_warning_v1', min: 0, max: 5000 },
      // 
      // FALLBACK DPs for other soil sensor variants
      // 
      1: { capability: 'measure_temperature', divisor: 10 },  // Some variants
      4: { capability: 'measure_ec', divisor: 1 },             // EC/fertilizer (GitHub #150 _TZE284_hdml1aav)
      // v5.9.22: Z2M #28270 - DP101=ambient_humidity for _TZE284_o9ofysmo/_TZE284_xc3vwx5a
      // HOBEIAN ZG-303Z uses DP109 for air humidity instead
      101: { capability: 'measure_humidity', divisor: 1 },
      106: { capability: 'measure_ec', divisor: 1 },  // Alternate EC DP for advanced soil sensors
      105: { capability: 'measure_humidity.soil', divisor: 1, transform: (v) => v > 100 ? safeMultiply(v, 10) : v },
    };
  }

  /**
   * v5.5.82: ENHANCED ZCL cluster handlers
   *
   * CRITICAL FOR TZE284 DEVICES:
   * TZE284 devices like _TZE284_oitavov2 declare ZCL standard clusters:
   * - temperatureMeasurement
   * - relativeHumidity
   * - powerConfiguration
   *
   * These clusters MAY report data via ZCL even if Tuya DP doesn't work!
   */
  get clusterHandlers() {
    return {
      // 
      // TEMPERATURE - ZCL standard cluster (0x0402)
      // Value is in 0.01Â°C units, divide by 100
      // 
      temperatureMeasurement: {
        requireBinding: false,
        requireReporting: false,
        attributeReport: (data) => {
          if (data.measuredValue !== undefined) {
            const temp = data.measuredValue * 100;
            this.log(`[ZCL]  Temperature: ${temp}Â°C`);
            this._registerZigbeeHit?.();
            this.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(() => { });
          }
        }
      },

      // 
      // HUMIDITY - ZCL standard cluster (0x0405)
      // Value is in 0.01% units, divide by 100
      // 
      relativeHumidity: {
        requireBinding: false,
        requireReporting: false,
        attributeReport: (data) => {
          if (data.measuredValue !== undefined) {
            const humidity = data.measuredValue * 100;
            this.log(`[ZCL]  Humidity/Moisture: ${humidity}%`);
            this._registerZigbeeHit?.();
            // v5.11.16: ZCL humidity = AIR humidity. Soil moisture comes via Tuya DP3.
            if (this.hasCapability('measure_humidity')) {
              this.setCapabilityValue('measure_humidity', parseFloat(humidity)).catch(() => { });
            }
          }
        }
      },

      // 
      // BATTERY - ZCL standard cluster (0x0001)
      // 
      powerConfiguration: {
        requireBinding: false,
        requireReporting: false,
        attributeReport: (data) => {
          if (data.batteryPercentageRemaining !== undefined) {
            const battery = Math.round(data.batteryPercentageRemaining);
            this.log(`[ZCL]  Battery: ${battery}%`);
            this._registerZigbeeHit?.();
            this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
          }
        }
      }
    };
  }

  async onNodeInit({ zclNode }) {
    // v5.12.3: Wrap super in try/catch for battery device timeout
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
    this.log('[SOIL]  DP Mappings: DP3=soil_moisture, DP5=temp, DP14=battery_state, DP15=battery%, DP101=air_humidity, DP102=lux');
    this.log('[SOIL]  forceActiveTuyaMode:', this.forceActiveTuyaMode);
    this.log('[SOIL]  hybridModeEnabled:', this.hybridModeEnabled);

    // v5.5.334: Load settings for calibration and thresholds (Hobeian PR#6)
    this._temperatureCalibration = this.getSetting('temperature_calibration') || 0;
    this._humidityCalibration = this.getSetting('humidity_calibration') || 0;
    this._moistureCalibration = this.getSetting('moisture_calibration') || 0;
    this._soilWarningThreshold = this.getSetting('soil_warning_threshold') || 30;
    this._temperatureUnit = this.getSetting('temperature_unit') || 'celsius';

    this.log(`[SOIL]  Calibration: temp=${this._temperatureCalibration}, hum=${this._humidityCalibration}, moist=${this._moistureCalibration}`);
    this.log(`[SOIL]  Warning threshold: ${this._soilWarningThreshold}%, Unit: ${this._temperatureUnit}`);

    // v5.5.317: Initialize intelligent inference engines
    this._soilInference = new SoilMoistureInference(this, {
      maxMoistureJump: 25,    // Max 25% moisture change per reading
      dryThreshold: 20,       // Alert when below 20%
      wetThreshold: 80        // Alert when above 80%
    });
    this._batteryInference = new BatteryInference(this);

    // Initialize flow triggers
    this._initFlowTriggers();

    // Track previous values for threshold triggers
    this._previousMoisture = null;
    this._previousTemperature = null;
    this._previousBattery = null;
  }

  /**
   * v5.5.334: Handle settings changes (Hobeian PR#6 fix)
   * Note: Calibration is now handled automatically by the base class.
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[SOIL]  Settings changed:', changedKeys);

    if (changedKeys.includes('soil_warning_threshold')) {
      this._soilWarningThreshold = newSettings.soil_warning_threshold || 30;
      this._updateWaterAlarm();
    }
  }

  /**
   * v5.5.334: Update water alarm based on current moisture and threshold (Hobeian PR#6)
   */
  _updateWaterAlarm() {
    const moisture = this.getCapabilityValue('measure_humidity.soil');
    if (moisture !== null && this.hasCapability('alarm_water')) {
      const alarm = moisture < this._soilWarningThreshold;
      this.setCapabilityValue('alarm_water', alarm).catch(() => { });
      this.log(`[SOIL]  Water alarm updated: moisture=${moisture}%, threshold=${this._soilWarningThreshold}%, alarm=${alarm}`);
    }
  }

  /**
   * v5.5.334: Convert Celsius to Fahrenheit (Hobeian PR#6 fix - was inverted!)
   * Correct formula: F = C Ã— 9/5 + 32
   */
  _celsiusToFahrenheit(celsius) {
    return (celsius * safeMultiply(9, 5)) + 32;
  }

  /**
   * v5.5.334: Convert Fahrenheit to Celsius
   * Formula: C = (F - 32) Ã— 5/9
   */
  _fahrenheitToCelsius(fahrenheit) {
    return (fahrenheit - 32) * safeMultiply(5, 9);
  }

  /**
   * v5.5.197: ENHANCED _handleDP with DIRECT capability setting
   *
   * Diagnose and FIX why humidity (DP3) is not appearing:
   * 1. Log ALL received DPs with full details
   * 2. DIRECTLY set capabilities for critical DPs (bypass parent issues)
   * 3. Handle Buffer values from Z2M-style dpValues
   */
  _handleDP(dpId, value) {
    // Convert dpId to number if string
    const dp = Number(dpId);

    // Log ALL DPs for soil sensor debugging
    this.log('[SOIL] ');
    this.log(`[SOIL]  DP${dp} received!`);
    this.log(`[SOIL]    Raw value: ${value}`);
    this.log(`[SOIL]    Type: ${typeof value}`);
    this.log(`[SOIL]    Is Buffer: ${Buffer.isBuffer(value)}`);

    // Parse Buffer values (Z2M-style dpValues have data as Buffer)
    let parsedValue = value;
    if (Buffer.isBuffer(value)) {
      if (value.length === 4) {
        parsedValue = value.readInt32BE(0);
      } else if (value.length === 2) {
        parsedValue = value.readInt16BE(0);
      } else if (value.length === 1) {
        parsedValue = value.readUInt8(0);
      }
      this.log(`[SOIL]    Parsed from Buffer: ${parsedValue}`);
    }

    // 
    // DIRECT CAPABILITY SETTING for critical DPs
    // This bypasses any potential issues in parent handler
    // 

    
    
    if (dp === 112) {
      this.log(`[SOIL]  SOIL FERTILITY DP112 = ${parsedValue} S/cm`);
      this._safeSetCapability('measure_conductivity', parseFloat(parsedValue));
      return;
    }
    
    if (dp === 111) {
      const mfr = this.getSetting?.('zb_manufacturer_name') || '';if (mfr.includes('npj9bug3')) {
        this.log(`[SOIL]  SOIL MOISTURE DP111 = ${parsedValue}% [npj9bug3 specific]`);
        this._safeSetCapability('measure_humidity.soil', parseFloat(parsedValue));
      } else {
        this.log(`[SOIL]  WATER SHORTAGE DP111 = ${parsedValue} [bool fallback]`);
        this._safeSetCapability('alarm_water', parsedValue === 1);
      }
      return;
    }
    if (dp === 101) {
      this.log(`[SOIL]  AIR HUMIDITY DP101 = ${parsedValue}%` );
      this._safeSetCapability('measure_humidity', parseFloat(parsedValue));
      return;
    }
    if (dp === 109) {
      this.log(`[SOIL]  SOIL MOISTURE DP109 = ${parsedValue}%`);
      let cap = this.hasCapability('measure_humidity.soil') ? 'measure_humidity.soil' : 'measure_humidity';
      this._safeSetCapability(cap, parseFloat(parsedValue));
      return;
    }
    if (dp === 3) {
      if (parsedValue > 100 && !Buffer.isBuffer(value)) {
        this.log(`[SOIL]  DP3 value ${parsedValue} > 100%  compound frame artifact, skipping`);
        return;
      }
      this.log(`[SOIL]  SOIL MOISTURE DP3 = ${parsedValue}%`);

      let validatedMoisture = parsedValue;
      if (this._soilInference) {
        const currentTemp = this.getCapabilityValue('measure_temperature');
        validatedMoisture = this._soilInference.validateMoisture(parsedValue, currentTemp);
      }

      const targetCap = this.hasCapability('measure_humidity.soil') ? 'measure_humidity.soil' : 'measure_humidity';
      this._safeSetCapability(targetCap, parseFloat(validatedMoisture));

      if (this.hasCapability('alarm_water')) {
        const threshold = this._soilWarningThreshold || 30;
        // v6.1.1: Force alarm to false if moisture is clearly safe (> threshold)
        // This resolves 'stuck' alarms when DP111 is latched or BVB smoothing occurs.
        const alarm = (validatedMoisture < threshold);
        this._safeSetCapability('alarm_water', alarm);
        if (!alarm) {
          this.log(`[SOIL]  Forcing alarm_water to false as moisture ${validatedMoisture}% > ${threshold}%`);
        }
      }
      return;
    }

    if (dp === 5) {
      if (parsedValue > 10000 && !Buffer.isBuffer(value)) {
        this.log(`[SOIL]  DP5 value ${parsedValue} > 10000  compound frame artifact, skipping`);
        return;
      }
      let temp = parsedValue;
      const mfr = this.getSettingValue?.('zb_manufacturer_name') || '';const rawCelsius = mfr.toLowerCase().includes('_tze284_oitavov2') || mfr.toLowerCase().includes('_tze200_oitavov2');
      if (rawCelsius) { /* already Â°C */ }
      else if (temp > 1000) temp = temp * 100;
      else if (temp > 100) temp = safeMultiply(temp, 10);
      else temp = safeMultiply(temp, 10);

      this.log(`[SOIL]  TEMPERATURE DP5 = ${parsedValue}  Raw ${temp}Â°C` );
      this._safeSetCapability('measure_temperature', parseFloat(temp));
      return;
    }

    if (dp === 14) {
      if (parsedValue > 2 && !Buffer.isBuffer(value)) {
        this.log(`[SOIL]  DP14 value ${parsedValue} > 2  skipping`);
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

    // For other DPs, call parent handler
    this.log(`[SOIL]  DP${dp} not handled locally, calling parent` );
    super._handleDP(dpId, value);
  }

  /**
   * v5.5.154: Initialize flow triggers for soil sensor
   */
  _initFlowTriggers() {
    // v5.8.72: Safe flow card getter  prevents onNodeInit crash if card missing
    const safeGetTrigger = (id) => {
      try { return this.homey.flow.getTriggerCard(id)?.trigger(this, {}, {}).catch(this.error || console.error);}
      catch (e) { this.log(`[SOIL]  Flow trigger '${id}' not available: ${e.message}`); return null; }
    };

    // Register flow trigger cards
    // v5.5.705: Fixed Flow Card IDs to match driver.flow.compose.json exactly
    this._flowTriggerMoistureChanged = safeGetTrigger('soil_sensor_moisture_changed');
    this._flowTriggerSoilDry = safeGetTrigger('soil_sensor_soil_dry');
    this._flowTriggerSoilWet = safeGetTrigger('soil_sensor_soil_wet');
    this._flowTriggerTemperatureChanged = safeGetTrigger('soil_sensor_temperature_changed');
    this._flowTriggerBatteryLow = safeGetTrigger('soil_sensor_battery_low');

    // Condition cards are registered in driver.js with getConditionCard() + registerRunListener()
    // No need to re-register them here

    this.log('[SOIL] Flow triggers initialized');
  }

  /**
   * v5.13.1: HANDLE CUSTOM FLOW TRIGGERS via master hook
   */
  async _triggerCustomFlowsIfNeeded(capability, value, previousValue) {
    if (capability === 'measure_humidity.soil' || capability === 'measure_humidity') {
      this._triggerMoistureFlows(value);
    } else if (capability === 'measure_temperature') {
      this._triggerTemperatureFlows(value);
    } else if (capability === 'measure_battery') {
      this._triggerBatteryFlows(value);
    }
  }

  /**
   * Trigger moisture-related flows
   */
  _triggerMoistureFlows(moisture) {
    // Trigger: moisture changed
    if (this._flowTriggerMoistureChanged) {
      this._flowTriggerMoistureChanged.trigger(this, { moisture }).catch(this.error);
    }

    // Trigger: soil dry (moisture below 30%)
    if (this._previousMoisture !== null && moisture < 30 && this._previousMoisture >= 30) {
      if (this._flowTriggerSoilDry) {
        this._flowTriggerSoilDry.trigger(this, {}).catch(this.error);
      }
    }

    // Trigger: soil wet (moisture above 70%)
    if (this._previousMoisture !== null && moisture > 70 && this._previousMoisture <= 70) {
      if (this._flowTriggerSoilWet) {
        this._flowTriggerSoilWet.trigger(this, {}).catch(this.error);
      }
    }

    this._previousMoisture = moisture;
  }

  /**
   * Trigger temperature-related flows
   */
  _triggerTemperatureFlows(temperature) {
    // Trigger: temperature changed
    if (this._flowTriggerTemperatureChanged) {
      this._flowTriggerTemperatureChanged.trigger(this, { temperature }).catch(this.error);
    }

    this._previousTemperature = temperature;
  }

  /**
   * Trigger battery-related flows
   */
  _triggerBatteryFlows(battery) {
    // Trigger: battery low (below 20%)
    if (battery <= 20 && (this._previousBattery === null || this._previousBattery > 20)) {
      if (this._flowTriggerBatteryLow) {
        this._flowTriggerBatteryLow.trigger(this, { battery }).catch(this.error);
        this.log(`[SOIL]  Battery low alert triggered: ${battery}%`);
      }
    }

    this._previousBattery = battery;
  }

  /**
   * Request DPs when device wakes up
   * Called automatically by TuyaUnifiedDevice when data is received
   */
  async onWakeUp() {
    this.log('[SOIL] Device woke up - requesting all DPs');
    await this.requestAllDPs();
  }

  /**
   * v5.5.48: Clean up
   */
  onDeleted() {
    super.onDeleted();
    this.log('[SOIL] Device deleted');
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = SoilSensorDevice;


