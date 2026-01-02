'use strict';

const TuyaHybridDevice = require('../../lib/devices/TuyaHybridDevice');
const BatteryCalculator = require('../../lib/battery/BatteryCalculator');
const { getAppVersionPrefixed } = require('../../lib/utils/AppVersion');
const { SoilMoistureInference, BatteryInference } = require('../../lib/IntelligentSensorInference');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║            SOIL SENSOR - v5.5.317 INTELLIGENT INFERENCE                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  🧠 v5.5.317: INTELLIGENT INFERENCE ENGINE                                   ║
 * ║  - Validates moisture readings with temperature correlation                 ║
 * ║  - Predicts watering needs based on moisture trends                         ║
 * ║  - Smooths erratic sensor readings                                          ║
 * ║                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Uses TuyaHybridDevice base class with proper:                               ║
 * ║  - tuyaCluster handlers (Tuya DP reception via 0xEF00)                       ║
 * ║  - cluster handlers (Zigbee standard reception)                              ║
 * ║  - tuyaBoundCluster (Tuya DP commands to device)                             ║
 * ║  - Hybrid mode auto-detection after 15 min                                   ║
 * ║                                                                              ║
 * ║  KNOWN MODELS:                                                               ║
 * ║  - TS0601 / _TZE284_oitavov2 : QT-07S Soil moisture sensor                   ║
 * ║  - TS0601 / _TZE284_aao3yzhs : Soil sensor variant                           ║
 * ║                                                                              ║
 * ║  DP MAPPINGS (from Z2M/ZHA):                                                 ║
 * ║  - DP3: soil_moisture %                                                      ║
 * ║  - DP5: temperature ÷10                                                      ║
 * ║  - DP14: battery_state enum (0=low, 1=med, 2=high)                           ║
 * ║  - DP15: battery_percent %                                                   ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class SoilSensorDevice extends TuyaHybridDevice {

  /** Battery powered */
  get mainsPowered() { return false; }

  // v5.5.54: FORCE ACTIVE MODE - Do NOT block DP requests in passive mode
  // Soil sensors need active queries even if cluster 0xEF00 not visible
  get forceActiveTuyaMode() { return true; }

  // v5.5.54: Enable TRUE HYBRID mode - listen to BOTH ZCL AND Tuya DP
  get hybridModeEnabled() { return true; }

  /** Capabilities for soil sensors - v5.5.330 Hobeian */
  get sensorCapabilities() {
    return ['measure_soil_moisture', 'measure_temperature', 'measure_humidity', 'measure_battery', 'alarm_water'];
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
   * - DP5: temperature ÷10 (°C)
   * - DP9: temperature_unit (0=C, 1=F)
   * - DP14: water_warning alarm (0=none, 1=alarm)
   * - DP15: battery_percent %
   * - DP109: air_humidity % (0-100%)
   *
   * QT-07S (_TZE284_oitavov2) uses:
   * - DP2: temperature_unit (0=C, 1=F)
   * - DP3: soil_moisture %
   * - DP5: temperature ÷10
   * - DP14: battery_state enum (0=low, 1=med, 2=high)
   * - DP15: battery_percent %
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // SOIL MOISTURE - DP3 (main sensor value) - Hobeian ZG-303Z
      // ═══════════════════════════════════════════════════════════════════
      3: { capability: 'measure_soil_moisture', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // TEMPERATURE - DP5 (soil/ambient temperature)
      // Some devices report ×10, others ×100 - auto-detect
      // ═══════════════════════════════════════════════════════════════════
      5: {
        capability: 'measure_temperature',
        transform: (v) => {
          // Auto-detect scale: if value > 1000, it's ÷100, else ÷10
          if (v > 1000) return v / 100;
          if (v > 100) return v / 10;
          return v / 10; // Default ÷10
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // AIR HUMIDITY - DP109 (Hobeian ZG-303Z specific)
      // ═══════════════════════════════════════════════════════════════════
      109: { capability: 'measure_humidity', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY - DP15 (percentage)
      // ═══════════════════════════════════════════════════════════════════
      15: { capability: 'measure_battery', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // DP14: BATTERY STATE (standard Tuya soil sensors per Z2M)
      // Z2M: [14, 'battery_state', tuya.valueConverter.batteryState]
      // Enum: 0=low, 1=medium, 2=high → converted in _handleDP
      // Note: Handled directly in _handleDP for proper battery conversion
      // ═══════════════════════════════════════════════════════════════════
      14: { capability: 'measure_battery', transform: (v) => ({ 0: 10, 1: 50, 2: 100 }[v] ?? v) },

      // ═══════════════════════════════════════════════════════════════════
      // TEMPERATURE UNIT - DP9 (Hobeian) / DP2 (QT-07S)
      // 0=Celsius, 1=Fahrenheit - stored internally, not a capability
      // ═══════════════════════════════════════════════════════════════════
      9: { capability: null, internal: 'temperature_unit' },
      2: { capability: null, internal: 'temperature_unit' },

      // ═══════════════════════════════════════════════════════════════════
      // FALLBACK DPs for other soil sensor variants
      // ═══════════════════════════════════════════════════════════════════
      1: { capability: 'measure_temperature', divisor: 10 },  // Some variants
      4: { capability: 'measure_battery', divisor: 1 },       // Alternative battery DP
      101: { capability: 'measure_soil_moisture', divisor: 1 },    // Alternative moisture
      105: { capability: 'measure_soil_moisture', divisor: 1, transform: (v) => v > 100 ? v / 10 : v },
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
      // ═══════════════════════════════════════════════════════════════════
      // TEMPERATURE - ZCL standard cluster (0x0402)
      // Value is in 0.01°C units, divide by 100
      // ═══════════════════════════════════════════════════════════════════
      temperatureMeasurement: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined) {
            const temp = data.measuredValue / 100;
            this.log(`[ZCL] 🌡️ Temperature: ${temp}°C`);
            this._registerZigbeeHit?.();
            this.setCapabilityValue('measure_temperature', temp).catch(() => { });
          }
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // HUMIDITY - ZCL standard cluster (0x0405)
      // Value is in 0.01% units, divide by 100
      // ═══════════════════════════════════════════════════════════════════
      relativeHumidity: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined) {
            const humidity = data.measuredValue / 100;
            this.log(`[ZCL] 💧 Humidity/Moisture: ${humidity}%`);
            this._registerZigbeeHit?.();
            this.setCapabilityValue('measure_humidity', humidity).catch(() => { });
          }
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY - ZCL standard cluster (0x0001)
      // ═══════════════════════════════════════════════════════════════════
      powerConfiguration: {
        attributeReport: (data) => {
          if (data.batteryPercentageRemaining !== undefined) {
            const battery = Math.round(data.batteryPercentageRemaining / 2);
            this.log(`[ZCL] 🔋 Battery: ${battery}%`);
            this._registerZigbeeHit?.();
            this.setCapabilityValue('measure_battery', battery).catch(() => { });
          }
        }
      }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    this.log('[SOIL] ════════════════════════════════════════════════════════════');
    this.log(`[SOIL] Soil Sensor ${getAppVersionPrefixed()} INTELLIGENT INFERENCE`);
    this.log('[SOIL] ════════════════════════════════════════════════════════════');
    this.log('[SOIL] ⚠️ BATTERY DEVICE - Data comes when device wakes up');
    this.log('[SOIL] ℹ️ First data may take 10-60 minutes after pairing');
    this.log('[SOIL] 📋 DP Mappings: DP3=humidity, DP5=temp, DP14=battery_state, DP15=battery%');
    this.log('[SOIL] 🔧 forceActiveTuyaMode:', this.forceActiveTuyaMode);
    this.log('[SOIL] 🔧 hybridModeEnabled:', this.hybridModeEnabled);

    // v5.5.334: Load settings for calibration and thresholds (Hobeian PR#6)
    this._temperatureCalibration = this.getSetting('temperature_calibration') || 0;
    this._humidityCalibration = this.getSetting('humidity_calibration') || 0;
    this._moistureCalibration = this.getSetting('moisture_calibration') || 0;
    this._soilWarningThreshold = this.getSetting('soil_warning_threshold') || 30;
    this._temperatureUnit = this.getSetting('temperature_unit') || 'celsius';

    this.log(`[SOIL] 🔧 Calibration: temp=${this._temperatureCalibration}, hum=${this._humidityCalibration}, moist=${this._moistureCalibration}`);
    this.log(`[SOIL] 🔧 Warning threshold: ${this._soilWarningThreshold}%, Unit: ${this._temperatureUnit}`);

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
   * Implements temperature_unit, calibration offsets, and soil_warning threshold
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[SOIL] ⚙️ Settings changed:', changedKeys);

    for (const key of changedKeys) {
      const newValue = newSettings[key];
      this.log(`[SOIL] Setting ${key}: ${oldSettings[key]} → ${newValue}`);

      switch (key) {
        case 'temperature_calibration':
          this._temperatureCalibration = newValue || 0;
          break;
        case 'humidity_calibration':
          this._humidityCalibration = newValue || 0;
          break;
        case 'moisture_calibration':
          this._moistureCalibration = newValue || 0;
          break;
        case 'soil_warning_threshold':
          this._soilWarningThreshold = newValue || 30;
          // Re-evaluate alarm_water based on current moisture
          this._updateWaterAlarm();
          break;
        case 'temperature_unit':
          this._temperatureUnit = newValue || 'celsius';
          // Re-display temperature in new unit
          const currentTemp = this.getCapabilityValue('measure_temperature');
          if (currentTemp !== null) {
            this.log(`[SOIL] Temperature unit changed, current: ${currentTemp}°C`);
          }
          break;
      }
    }
  }

  /**
   * v5.5.334: Update water alarm based on current moisture and threshold (Hobeian PR#6)
   */
  _updateWaterAlarm() {
    const moisture = this.getCapabilityValue('measure_soil_moisture');
    if (moisture !== null && this.hasCapability('alarm_water')) {
      const alarm = moisture < this._soilWarningThreshold;
      this.setCapabilityValue('alarm_water', alarm).catch(() => { });
      this.log(`[SOIL] 💧 Water alarm updated: moisture=${moisture}%, threshold=${this._soilWarningThreshold}%, alarm=${alarm}`);
    }
  }

  /**
   * v5.5.334: Convert Celsius to Fahrenheit (Hobeian PR#6 fix - was inverted!)
   * Correct formula: F = C × 9/5 + 32
   */
  _celsiusToFahrenheit(celsius) {
    return (celsius * 9 / 5) + 32;
  }

  /**
   * v5.5.334: Convert Fahrenheit to Celsius
   * Formula: C = (F - 32) × 5/9
   */
  _fahrenheitToCelsius(fahrenheit) {
    return (fahrenheit - 32) * 5 / 9;
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
    this.log('[SOIL] ════════════════════════════════════════════════════════');
    this.log(`[SOIL] 📥 DP${dp} received!`);
    this.log(`[SOIL]    Raw value: ${value}`);
    this.log(`[SOIL]    Type: ${typeof value}`);
    this.log(`[SOIL]    Is Buffer: ${Buffer.isBuffer(value)}`);

    // Parse Buffer values (Z2M-style dpValues have data as Buffer)
    let parsedValue = value;
    if (Buffer.isBuffer(value)) {
      if (value.length === 4) {
        parsedValue = value.readUInt32BE(0);
      } else if (value.length === 2) {
        parsedValue = value.readUInt16BE(0);
      } else if (value.length === 1) {
        parsedValue = value.readUInt8(0);
      }
      this.log(`[SOIL]    Parsed from Buffer: ${parsedValue}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DIRECT CAPABILITY SETTING for critical DPs
    // This bypasses any potential issues in parent handler
    // ═══════════════════════════════════════════════════════════════════════

    if (dp === 3) {
      // DP3 = SOIL MOISTURE (measure_soil_moisture)
      this.log('[SOIL] 🌱 ════════════════════════════════════════════════════');
      this.log(`[SOIL] 🌱 SOIL MOISTURE DP3 = ${parsedValue}%`);

      // v5.5.334: Apply calibration offset (Hobeian PR#6)
      let calibratedMoisture = parsedValue + (this._moistureCalibration || 0);
      calibratedMoisture = Math.max(0, Math.min(100, calibratedMoisture)); // Clamp 0-100

      // v5.5.317: Validate with inference engine
      let validatedMoisture = calibratedMoisture;
      if (this._soilInference) {
        const currentTemp = this.getCapabilityValue('measure_temperature');
        validatedMoisture = this._soilInference.validateMoisture(calibratedMoisture, currentTemp);

        // Log watering prediction
        const wateringNeed = this._soilInference.predictWateringNeed();
        if (wateringNeed) {
          this.log(`[SOIL] 💧 Watering: ${wateringNeed.message} (${wateringNeed.urgency})`);
        }
        this.log(`[SOIL] 📈 Trend: ${this._soilInference.getTrend()}`);
      }
      this.log(`[SOIL] 🌱 Calibrated: ${parsedValue} + ${this._moistureCalibration || 0} = ${validatedMoisture}%`);
      this.log('[SOIL] 🌱 ════════════════════════════════════════════════════');

      // DIRECT SET - bypass parent handler potential issues
      if (this.hasCapability('measure_soil_moisture')) {
        this.setCapabilityValue('measure_soil_moisture', validatedMoisture)
          .then(() => this.log(`[SOIL] ✅ measure_soil_moisture SET to ${validatedMoisture}%`))
          .catch(err => this.log(`[SOIL] ❌ measure_soil_moisture FAILED: ${err.message}`));
      } else if (this.hasCapability('measure_humidity')) {
        // Fallback for devices without measure_soil_moisture
        this.setCapabilityValue('measure_humidity', validatedMoisture)
          .then(() => this.log(`[SOIL] ✅ measure_humidity SET to ${validatedMoisture}%`))
          .catch(err => this.log(`[SOIL] ❌ measure_humidity FAILED: ${err.message}`));
      } else {
        this.log('[SOIL] ⚠️ No moisture capability found!');
      }

      // v5.5.334: Update water alarm based on threshold (Hobeian PR#6)
      if (this.hasCapability('alarm_water')) {
        const threshold = this._soilWarningThreshold || 30;
        const alarm = validatedMoisture < threshold;
        this.setCapabilityValue('alarm_water', alarm).catch(() => { });
        if (alarm) {
          this.log(`[SOIL] ⚠️ WATER ALARM: Moisture ${validatedMoisture}% < threshold ${threshold}%`);
        }
      }
      return; // Don't call parent - we handled it directly
    }

    if (dp === 5) {
      // DP5 = TEMPERATURE (divide by 10)
      let temp = parsedValue;
      if (temp > 1000) temp = temp / 100;
      else if (temp > 100) temp = temp / 10;
      else temp = temp / 10;

      // v5.5.334: Apply calibration offset (Hobeian PR#6)
      temp = temp + (this._temperatureCalibration || 0);

      this.log(`[SOIL] 🌡️ TEMPERATURE DP5 = ${parsedValue} → ${temp}°C (calibration: ${this._temperatureCalibration || 0})`);

      if (this.hasCapability('measure_temperature')) {
        this.setCapabilityValue('measure_temperature', temp)
          .then(() => this.log(`[SOIL] ✅ measure_temperature SET to ${temp}°C`))
          .catch(err => this.log(`[SOIL] ❌ measure_temperature FAILED: ${err.message}`));
      }
      return;
    }

    if (dp === 14) {
      // DP14 = BATTERY STATE (enum: 0=low, 1=med, 2=high)
      const batteryMap = { 0: 10, 1: 50, 2: 100 };
      const battery = batteryMap[parsedValue] ?? parsedValue;
      this.log(`[SOIL] 🔋 BATTERY STATE DP14 = ${parsedValue} → ${battery}%`);

      if (this.hasCapability('measure_battery')) {
        this.setCapabilityValue('measure_battery', battery)
          .then(() => this.log(`[SOIL] ✅ measure_battery SET to ${battery}%`))
          .catch(err => this.log(`[SOIL] ❌ measure_battery FAILED: ${err.message}`));
      }
      return;
    }

    if (dp === 15) {
      // DP15 = BATTERY PERCENTAGE (direct)
      this.log(`[SOIL] 🔋 BATTERY % DP15 = ${parsedValue}%`);

      if (this.hasCapability('measure_battery')) {
        this.setCapabilityValue('measure_battery', parsedValue)
          .then(() => this.log(`[SOIL] ✅ measure_battery SET to ${parsedValue}%`))
          .catch(err => this.log(`[SOIL] ❌ measure_battery FAILED: ${err.message}`));
      }
      return;
    }

    // For other DPs, call parent handler
    this.log(`[SOIL] ℹ️ DP${dp} not handled locally, calling parent`);
    super._handleDP(dpId, value);
  }

  /**
   * v5.5.154: Initialize flow triggers for soil sensor
   */
  _initFlowTriggers() {
    // Register flow trigger cards
    // v5.5.178: Fixed Flow Card IDs to match driver.flow.compose.json
    this._flowTriggerMoistureChanged = this.homey.flow.getDeviceTriggerCard('soil_sensor_soil_moisture_changed');
    this._flowTriggerSoilDry = this.homey.flow.getDeviceTriggerCard('soil_sensor_soil_dry');
    this._flowTriggerSoilWet = this.homey.flow.getDeviceTriggerCard('soil_sensor_soil_wet');
    this._flowTriggerTemperatureChanged = this.homey.flow.getDeviceTriggerCard('soil_sensor_soil_temperature_changed');
    this._flowTriggerBatteryLow = this.homey.flow.getDeviceTriggerCard('soil_sensor_battery_low');

    // Register condition cards (correct IDs from driver.flow.compose.json)
    this._conditionMoistureBelow = this.homey.flow.getConditionCard('soil_sensor_moisture_below');
    this._conditionMoistureAbove = this.homey.flow.getConditionCard('soil_sensor_moisture_above');
    this._conditionTemperatureAbove = this.homey.flow.getConditionCard('soil_sensor_temperature_above');

    // Condition: soil moisture is below threshold
    if (this._conditionMoistureBelow) {
      this._conditionMoistureBelow.registerRunListener(async (args, state) => {
        // v5.5.337: Use measure_soil_moisture first, fallback to measure_humidity
        const moisture = this.getCapabilityValue('measure_soil_moisture') ?? this.getCapabilityValue('measure_humidity');
        return moisture < args.moisture;
      });
    }

    // Condition: soil moisture is above threshold
    if (this._conditionMoistureAbove) {
      this._conditionMoistureAbove.registerRunListener(async (args, state) => {
        // v5.5.337: Use measure_soil_moisture first, fallback to measure_humidity
        const moisture = this.getCapabilityValue('measure_soil_moisture') ?? this.getCapabilityValue('measure_humidity');
        return moisture > args.moisture;
      });
    }

    // Condition: soil temperature is above threshold
    if (this._conditionTemperatureAbove) {
      this._conditionTemperatureAbove.registerRunListener(async (args, state) => {
        const temp = this.getCapabilityValue('measure_temperature');
        return temp > args.temp;
      });
    }

    this.log('[SOIL] Flow triggers initialized');
  }

  /**
   * v5.5.154: Override setCapabilityValue to trigger flows
   */
  async setCapabilityValue(capability, value) {
    await super.setCapabilityValue(capability, value);

    // Trigger flows based on capability changes
    // v5.5.337: Handle both measure_soil_moisture and measure_humidity
    if (capability === 'measure_soil_moisture' || capability === 'measure_humidity') {
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
        this.log(`[SOIL] 🔋 Battery low alert triggered: ${battery}%`);
      }
    }

    this._previousBattery = battery;
  }

  /**
   * Request DPs when device wakes up
   * Called automatically by TuyaHybridDevice when data is received
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
}

module.exports = SoilSensorDevice;
