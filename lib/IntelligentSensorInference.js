'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║            INTELLIGENT SENSOR INFERENCE ENGINE - v5.5.317                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Multi-source data inference system for improving sensor accuracy            ║
 * ║  Deduces missing or invalid values from correlated sensor data               ║
 * ║                                                                              ║
 * ║  APPLICABLE TO:                                                              ║
 * ║  - Motion sensors: Infer motion from lux changes                             ║
 * ║  - Climate sensors: Validate temp/humidity correlation                       ║
 * ║  - Presence sensors: Infer from distance + lux + activity                    ║
 * ║  - Soil sensors: Validate moisture from temperature correlation              ║
 * ║  - Air quality: Cross-validate CO2/VOC/PM2.5 readings                        ║
 * ║                                                                              ║
 * ║  RESEARCH SOURCES:                                                           ║
 * ║  - Z2M #27212: _TZE284_iadro9bf presence=null bug                           ║
 * ║  - Z2M #18950: Raw ADC vs lux values                                        ║
 * ║  - SmartHomeScene: ZY-M100 sensor specifications                            ║
 * ║  - ZHA quirks: Multi-sensor correlation patterns                            ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Base class for intelligent sensor inference
 * Tracks multiple data sources and calculates confidence-weighted values
 */
class IntelligentSensorInference {
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      historySize: options.historySize || 10,
      confidenceDecayMs: options.confidenceDecayMs || 60000, // 1 minute
      minConfidence: options.minConfidence || 30,
      ...options
    };

    // Data history for each source
    this._history = new Map();
    this._lastValues = new Map();
    this._confidence = 50; // Start neutral
  }

  /**
   * Record a value from a specific source
   */
  recordValue(source, value, timestamp = Date.now()) {
    if (value === null || value === undefined) return;

    const history = this._history.get(source) || [];
    history.push({ value, timestamp });

    // Keep only recent history
    while (history.length > this.options.historySize) {
      history.shift();
    }

    this._history.set(source, history);
    this._lastValues.set(source, { value, timestamp });
  }

  /**
   * Get the rate of change for a source
   */
  getRateOfChange(source) {
    const history = this._history.get(source);
    if (!history || history.length < 2) return 0;

    const recent = history.slice(-3);
    if (recent.length < 2) return 0;

    const first = recent[0];
    const last = recent[recent.length - 1];
    const timeDiff = (last.timestamp - first.timestamp) / 1000; // seconds

    if (timeDiff === 0) return 0;
    return (last.value - first.value) / timeDiff;
  }

  /**
   * Check if a source has had recent activity (value changes)
   */
  hasRecentActivity(source, windowMs = 30000) {
    const history = this._history.get(source);
    if (!history || history.length < 2) return false;

    const now = Date.now();
    const recentHistory = history.filter(h => (now - h.timestamp) < windowMs);

    if (recentHistory.length < 2) return false;

    // Check for variance in values
    const values = recentHistory.map(h => h.value);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return (max - min) > 0;
  }

  /**
   * Get confidence level (0-100)
   */
  getConfidence() {
    return Math.round(this._confidence);
  }

  /**
   * Log with device context
   */
  log(message) {
    if (this.device?.log) {
      this.device.log(message);
    }
  }
}

/**
 * Motion inference from lux changes
 * Detects motion by analyzing rapid illuminance fluctuations
 */
class MotionLuxInference extends IntelligentSensorInference {
  constructor(device, options = {}) {
    super(device, {
      luxChangeThreshold: options.luxChangeThreshold || 5, // % change to trigger
      luxActivityWindow: options.luxActivityWindow || 5000, // 5 seconds
      motionHoldTime: options.motionHoldTime || 30000, // 30 seconds
      ...options
    });

    this._inferredMotion = false;
    this._lastMotionTime = 0;
    this._luxBaseline = null;
  }

  /**
   * Update lux value and infer motion
   * @returns {boolean|null} Inferred motion state or null if uncertain
   */
  updateLux(luxValue) {
    const now = Date.now();
    this.recordValue('lux', luxValue, now);

    // Establish baseline if not set
    if (this._luxBaseline === null) {
      this._luxBaseline = luxValue;
      return null;
    }

    // Calculate change from baseline
    const change = Math.abs(luxValue - this._luxBaseline);
    const changePercent = (change / Math.max(this._luxBaseline, 1)) * 100;

    // Check for rapid changes indicating motion
    const rateOfChange = Math.abs(this.getRateOfChange('lux'));

    // Motion detected if:
    // 1. Significant change from baseline (> threshold%)
    // 2. OR rapid rate of change
    if (changePercent > this.options.luxChangeThreshold || rateOfChange > 2) {
      this._inferredMotion = true;
      this._lastMotionTime = now;
      this._confidence = Math.min(100, this._confidence + 10);

      this.log(`[LUX-MOTION] 🔦 Motion inferred: lux ${this._luxBaseline} → ${luxValue} (${changePercent.toFixed(1)}% change)`);
    }

    // Clear motion after hold time
    if (this._inferredMotion && (now - this._lastMotionTime) > this.options.motionHoldTime) {
      this._inferredMotion = false;
      this._luxBaseline = luxValue; // Update baseline when motion clears
      this._confidence = Math.max(30, this._confidence - 5);

      this.log(`[LUX-MOTION] ⏱️ Motion cleared after ${this.options.motionHoldTime / 1000}s`);
    }

    // Slowly update baseline when stable
    if (!this._inferredMotion && changePercent < 3) {
      this._luxBaseline = this._luxBaseline * 0.9 + luxValue * 0.1; // Weighted average
    }

    return this._inferredMotion;
  }

  /**
   * Update from direct motion sensor (calibrates inference)
   */
  updateDirectMotion(motionState) {
    this.recordValue('direct_motion', motionState ? 1 : 0);

    // Calibrate confidence based on match
    if (motionState === this._inferredMotion) {
      this._confidence = Math.min(100, this._confidence + 5);
    } else {
      this._confidence = Math.max(20, this._confidence - 10);
    }

    if (motionState) {
      this._lastMotionTime = Date.now();
    }
  }

  getMotion() {
    return this._inferredMotion;
  }
}

/**
 * Climate sensor inference - validates temp/humidity correlation
 * Uses psychrometric relationships to detect erratic readings
 */
class ClimateInference extends IntelligentSensorInference {
  constructor(device, options = {}) {
    super(device, {
      maxTempJump: options.maxTempJump || 5, // Max °C change per reading
      maxHumidityJump: options.maxHumidityJump || 15, // Max % change per reading
      correlationWindow: options.correlationWindow || 300000, // 5 minutes
      ...options
    });

    this._lastValidTemp = null;
    this._lastValidHumidity = null;
    this._erraticReadingCount = 0;
  }

  /**
   * Validate and smooth temperature reading
   * @returns {number|null} Validated temperature or null if rejected
   */
  validateTemperature(rawTemp) {
    const now = Date.now();
    this.recordValue('temp_raw', rawTemp, now);

    // Sanity check
    if (rawTemp < -40 || rawTemp > 80) {
      this.log(`[CLIMATE-INFER] ⚠️ Temperature out of range: ${rawTemp}°C - REJECTED`);
      this._erraticReadingCount++;
      return this._lastValidTemp;
    }

    // Check for impossible jumps
    if (this._lastValidTemp !== null) {
      const jump = Math.abs(rawTemp - this._lastValidTemp);
      const lastReading = this._lastValues.get('temp_validated');
      const timeSinceLast = lastReading ? (now - lastReading.timestamp) / 1000 : 60;

      // Allow larger jumps if more time has passed (max 1°C per minute natural change)
      const allowedJump = Math.max(this.options.maxTempJump, timeSinceLast / 60);

      if (jump > allowedJump) {
        this.log(`[CLIMATE-INFER] ⚠️ Temperature jump too large: ${this._lastValidTemp} → ${rawTemp}°C (${jump}°C) - SMOOTHING`);
        this._erraticReadingCount++;

        // Smooth towards new value instead of rejecting
        rawTemp = this._lastValidTemp + (rawTemp > this._lastValidTemp ? 1 : -1) * Math.min(jump, 2);
        this._confidence = Math.max(30, this._confidence - 10);
      }
    }

    this._lastValidTemp = rawTemp;
    this.recordValue('temp_validated', rawTemp, now);
    this._confidence = Math.min(100, this._confidence + 2);

    return rawTemp;
  }

  /**
   * Validate and smooth humidity reading
   * @returns {number|null} Validated humidity or null if rejected
   */
  validateHumidity(rawHumidity) {
    const now = Date.now();
    this.recordValue('humidity_raw', rawHumidity, now);

    // Sanity check
    if (rawHumidity < 0 || rawHumidity > 100) {
      this.log(`[CLIMATE-INFER] ⚠️ Humidity out of range: ${rawHumidity}% - REJECTED`);
      this._erraticReadingCount++;
      return this._lastValidHumidity;
    }

    // Check for impossible jumps
    if (this._lastValidHumidity !== null) {
      const jump = Math.abs(rawHumidity - this._lastValidHumidity);
      const lastReading = this._lastValues.get('humidity_validated');
      const timeSinceLast = lastReading ? (now - lastReading.timestamp) / 1000 : 60;

      // Allow larger jumps if more time has passed
      const allowedJump = Math.max(this.options.maxHumidityJump, timeSinceLast / 30);

      if (jump > allowedJump) {
        this.log(`[CLIMATE-INFER] ⚠️ Humidity jump too large: ${this._lastValidHumidity} → ${rawHumidity}% (${jump}%) - SMOOTHING`);
        this._erraticReadingCount++;

        // Smooth towards new value
        rawHumidity = this._lastValidHumidity + (rawHumidity > this._lastValidHumidity ? 1 : -1) * Math.min(jump, 5);
        this._confidence = Math.max(30, this._confidence - 10);
      }
    }

    this._lastValidHumidity = rawHumidity;
    this.recordValue('humidity_validated', rawHumidity, now);
    this._confidence = Math.min(100, this._confidence + 2);

    return rawHumidity;
  }

  /**
   * Check temp/humidity correlation (psychrometric validation)
   * High humidity should correlate with moderate temps in most environments
   */
  checkCorrelation() {
    if (this._lastValidTemp === null || this._lastValidHumidity === null) {
      return true; // Can't check without both values
    }

    // Very high humidity (>95%) at extreme temps is suspicious
    if (this._lastValidHumidity > 95) {
      if (this._lastValidTemp < 0 || this._lastValidTemp > 40) {
        this.log(`[CLIMATE-INFER] ⚠️ Suspicious correlation: ${this._lastValidTemp}°C @ ${this._lastValidHumidity}%`);
        return false;
      }
    }

    return true;
  }

  /**
   * Get health status of sensor
   */
  getSensorHealth() {
    return {
      erraticReadings: this._erraticReadingCount,
      confidence: this.getConfidence(),
      isHealthy: this._erraticReadingCount < 5 && this._confidence > 50
    };
  }
}

/**
 * Soil moisture inference - validates readings and detects sensor issues
 */
class SoilMoistureInference extends IntelligentSensorInference {
  constructor(device, options = {}) {
    super(device, {
      maxMoistureJump: options.maxMoistureJump || 20, // Max % change
      dryThreshold: options.dryThreshold || 20,
      wetThreshold: options.wetThreshold || 80,
      ...options
    });

    this._lastValidMoisture = null;
    this._trendDirection = 0; // -1 drying, 0 stable, 1 wetting
  }

  /**
   * Validate moisture reading with temperature correlation
   * @returns {number|null} Validated moisture or null if rejected
   */
  validateMoisture(rawMoisture, temperature = null) {
    const now = Date.now();
    this.recordValue('moisture_raw', rawMoisture, now);

    // Sanity check
    if (rawMoisture < 0 || rawMoisture > 100) {
      this.log(`[SOIL-INFER] ⚠️ Moisture out of range: ${rawMoisture}% - REJECTED`);
      return this._lastValidMoisture;
    }

    // Check for impossible jumps
    if (this._lastValidMoisture !== null) {
      const jump = Math.abs(rawMoisture - this._lastValidMoisture);

      if (jump > this.options.maxMoistureJump) {
        // Large jump - could be watering or sensor error
        // Check if temperature also changed (indicates real environmental change)
        const tempChanged = temperature && this.hasRecentActivity('temperature');

        if (!tempChanged && jump > 40) {
          this.log(`[SOIL-INFER] ⚠️ Moisture jump too large: ${this._lastValidMoisture} → ${rawMoisture}% - SMOOTHING`);
          rawMoisture = this._lastValidMoisture + (rawMoisture > this._lastValidMoisture ? 1 : -1) * 10;
          this._confidence = Math.max(30, this._confidence - 15);
        } else {
          this.log(`[SOIL-INFER] 💧 Large moisture change accepted (environmental factor detected)`);
        }
      }
    }

    // Update trend
    if (this._lastValidMoisture !== null) {
      if (rawMoisture > this._lastValidMoisture + 2) this._trendDirection = 1;
      else if (rawMoisture < this._lastValidMoisture - 2) this._trendDirection = -1;
      else this._trendDirection = 0;
    }

    this._lastValidMoisture = rawMoisture;
    this.recordValue('moisture_validated', rawMoisture, now);

    if (temperature !== null) {
      this.recordValue('temperature', temperature, now);
    }

    return rawMoisture;
  }

  /**
   * Predict if plant needs watering based on trend
   */
  predictWateringNeed() {
    if (this._lastValidMoisture === null) return null;

    const currentMoisture = this._lastValidMoisture;
    const isDrying = this._trendDirection === -1;

    if (currentMoisture < this.options.dryThreshold) {
      return { needed: true, urgency: 'high', message: 'Soil is dry - water now' };
    }

    if (currentMoisture < 40 && isDrying) {
      return { needed: true, urgency: 'medium', message: 'Soil drying - water soon' };
    }

    if (currentMoisture > this.options.wetThreshold) {
      return { needed: false, urgency: 'none', message: 'Soil is wet - do not water' };
    }

    return { needed: false, urgency: 'low', message: 'Moisture level OK' };
  }

  getTrend() {
    return ['drying', 'stable', 'wetting'][this._trendDirection + 1];
  }
}

/**
 * Air quality inference - cross-validates multiple pollutant readings
 */
class AirQualityInference extends IntelligentSensorInference {
  constructor(device, options = {}) {
    super(device, {
      co2Baseline: options.co2Baseline || 400, // Outdoor baseline ppm
      vocCorrelationFactor: options.vocCorrelationFactor || 0.5,
      ...options
    });

    this._lastCO2 = null;
    this._lastVOC = null;
    this._lastPM25 = null;
  }

  /**
   * Validate CO2 reading with VOC correlation
   */
  validateCO2(rawCO2, vocValue = null) {
    const now = Date.now();
    this.recordValue('co2_raw', rawCO2, now);

    // Sanity check (outdoor: ~400, indoor can reach 5000+)
    if (rawCO2 < 300 || rawCO2 > 10000) {
      this.log(`[AQ-INFER] ⚠️ CO2 out of range: ${rawCO2}ppm - REJECTED`);
      return this._lastCO2;
    }

    // Cross-validate with VOC if available
    if (vocValue !== null && this._lastVOC !== null) {
      // High CO2 should generally correlate with higher VOC (poor ventilation)
      const co2Elevated = rawCO2 > 1000;
      const vocElevated = vocValue > 500;

      // Check for mismatch (one high, other low)
      if (co2Elevated && !vocElevated && vocValue < 200) {
        this.log(`[AQ-INFER] ⚠️ CO2/VOC mismatch: CO2=${rawCO2}ppm, VOC=${vocValue}ppb - CHECK SENSOR`);
        this._confidence = Math.max(30, this._confidence - 10);
      }
    }

    this._lastCO2 = rawCO2;
    this.recordValue('co2_validated', rawCO2, now);

    return rawCO2;
  }

  /**
   * Calculate overall air quality index (0-500 scale)
   */
  calculateAQI() {
    let aqi = 0;
    let factors = 0;

    if (this._lastCO2 !== null) {
      // CO2 contribution (400=good, 1000=moderate, 2000=poor)
      const co2Aqi = Math.min(500, Math.max(0, (this._lastCO2 - 400) / 4));
      aqi += co2Aqi;
      factors++;
    }

    if (this._lastPM25 !== null) {
      // PM2.5 contribution (0-12=good, 35=moderate, 55=unhealthy)
      const pm25Aqi = Math.min(500, this._lastPM25 * 4);
      aqi += pm25Aqi;
      factors++;
    }

    if (this._lastVOC !== null) {
      // VOC contribution (0-400=good, 2200=poor)
      const vocAqi = Math.min(500, this._lastVOC / 4);
      aqi += vocAqi;
      factors++;
    }

    return factors > 0 ? Math.round(aqi / factors) : null;
  }

  updateVOC(value) {
    this._lastVOC = value;
    this.recordValue('voc', value);
  }

  updatePM25(value) {
    this._lastPM25 = value;
    this.recordValue('pm25', value);
  }
}

/**
 * Battery inference - predicts battery life from discharge patterns
 */
class BatteryInference extends IntelligentSensorInference {
  constructor(device, options = {}) {
    super(device, {
      lowBatteryThreshold: options.lowBatteryThreshold || 20,
      criticalBatteryThreshold: options.criticalBatteryThreshold || 10,
      ...options
    });

    this._lastBattery = null;
    this._dischargeRate = null; // % per day
  }

  /**
   * Validate and track battery level
   */
  validateBattery(rawBattery) {
    const now = Date.now();

    // Sanity check
    if (rawBattery < 0 || rawBattery > 100) {
      this.log(`[BATTERY-INFER] ⚠️ Battery out of range: ${rawBattery}% - REJECTED`);
      return this._lastBattery;
    }

    // Detect sudden increases (indicates charging or error)
    if (this._lastBattery !== null && rawBattery > this._lastBattery + 5) {
      const lastReading = this._lastValues.get('battery');
      const hoursSinceLast = lastReading ? (now - lastReading.timestamp) / 3600000 : 0;

      // If battery increased significantly without much time passing, likely error
      if (hoursSinceLast < 1 && rawBattery > this._lastBattery + 10) {
        this.log(`[BATTERY-INFER] ⚠️ Battery increased ${this._lastBattery}% → ${rawBattery}% (unlikely) - IGNORED`);
        return this._lastBattery;
      }
    }

    // Calculate discharge rate
    if (this._lastBattery !== null && rawBattery < this._lastBattery) {
      const lastReading = this._lastValues.get('battery');
      if (lastReading) {
        const daysSinceLast = (now - lastReading.timestamp) / 86400000;
        if (daysSinceLast > 0) {
          const newRate = (this._lastBattery - rawBattery) / daysSinceLast;
          // Weighted average with previous rate
          this._dischargeRate = this._dischargeRate
            ? this._dischargeRate * 0.7 + newRate * 0.3
            : newRate;
        }
      }
    }

    this._lastBattery = rawBattery;
    this.recordValue('battery', rawBattery, now);

    return rawBattery;
  }

  /**
   * Predict days until battery dies
   */
  predictDaysRemaining() {
    if (this._lastBattery === null || this._dischargeRate === null || this._dischargeRate <= 0) {
      return null;
    }

    return Math.round(this._lastBattery / this._dischargeRate);
  }

  /**
   * Get battery status
   */
  getStatus() {
    if (this._lastBattery === null) return 'unknown';
    if (this._lastBattery <= this.options.criticalBatteryThreshold) return 'critical';
    if (this._lastBattery <= this.options.lowBatteryThreshold) return 'low';
    return 'ok';
  }
}

module.exports = {
  IntelligentSensorInference,
  MotionLuxInference,
  ClimateInference,
  SoilMoistureInference,
  AirQualityInference,
  BatteryInference
};
