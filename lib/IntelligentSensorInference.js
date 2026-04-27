'use strict';
const { safeDivide, safeMultiply, safeParse } = require('./utils/MathUtils.js');

/**
 * INTELLIGENT SENSOR INFERENCE ENGINE - v7.4.11
 * Multi-source data inference system for improving sensor accuracy.
 */
class IntelligentSensorInference {
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      historySize: options.historySize || 10,
      confidenceDecayMs: options.confidenceDecayMs || 60000,
      minConfidence: options.minConfidence || 30,
      ...options
    };
    this._history = new Map();
    this._lastValues = new Map();
    this._confidence = 50;
  }

  recordValue(source, value, timestamp = Date.now()) {
    if (value === null || value === undefined) return;
    const history = this._history.get(source) || [];
    history.push({ value, timestamp });
    while (history.length > this.options.historySize) history.shift();
    this._history.set(source, history);
    this._lastValues.set(source, { value, timestamp });
  }

  getRateOfChange(source) {
    const history = this._history.get(source);
    if (!history || history.length < 2) return 0;
    const recent = history.slice(-3);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const timeDiff = (last.timestamp - first.timestamp) / 1000;
    if (timeDiff === 0) return 0;
    return safeDivide(last.value - first.value, timeDiff);
  }

  hasRecentActivity(source, windowMs = 30000) {
    const history = this._history.get(source);
    if (!history || history.length < 2) return false;
    const now = Date.now();
    const recentHistory = history.filter(h => (now - h.timestamp) < windowMs);
    if (recentHistory.length < 2) return false;
    const values = recentHistory.map(h => h.value);
    return (Math.max(...values) - Math.min(...values)) > 0;
  }

  getConfidence() {
    return Math.round(this._confidence);
  }

  log(message) {
    if (this.device?.log) this.device.log(message);
  }
}

class MotionLuxInference extends IntelligentSensorInference {
  constructor(device, options = {}) {
    super(device, {
      luxChangeThreshold: options.luxChangeThreshold || 5,
      luxActivityWindow: options.luxActivityWindow || 5000,
      motionHoldTime: options.motionHoldTime || 30000,
      ...options
    });
    this._inferredMotion = false;
    this._lastMotionTime = 0;
    this._luxBaseline = null;
  }

  updateLux(luxValue) {
    const now = Date.now();
    this.recordValue('lux', luxValue, now);
    if (this._luxBaseline === null) {
      this._luxBaseline = luxValue;
      return null;
    }
    const change = Math.abs(luxValue - this._luxBaseline);
    const changePercent = (change / Math.max(this._luxBaseline, 1)) * 100;
    const rateOfChange = Math.abs(this.getRateOfChange('lux'));

    if (changePercent > this.options.luxChangeThreshold || rateOfChange > 2) {
      this._inferredMotion = true;
      this._lastMotionTime = now;
      this._confidence = Math.min(100, this._confidence + 10);
      this.log(`[LUX-MOTION] Motion inferred: lux ${this._luxBaseline} -> ${luxValue} (${changePercent.toFixed(1)}% change)`);
    }

    if (this._inferredMotion && (now - this._lastMotionTime) > this.options.motionHoldTime) {
      this._inferredMotion = false;
      this._luxBaseline = luxValue;
      this._confidence = Math.max(30, this._confidence - 5);
      this.log(`[LUX-MOTION] Motion cleared after ${this.options.motionHoldTime / 1000}s`);
    }

    if (!this._inferredMotion && changePercent < 3) {
      this._luxBaseline = (this._luxBaseline * 0.9) + (luxValue * 0.1);
    }
    return this._inferredMotion;
  }

  updateDirectMotion(motionState) {
    this.recordValue('direct_motion', motionState ? 1 : 0);
    this._confidence = motionState === this._inferredMotion ? Math.min(100, this._confidence + 5) : Math.max(20, this._confidence - 10);
    if (motionState) this._lastMotionTime = Date.now();
  }

  getMotion() {
    return this._inferredMotion;
  }
}

class ClimateInference extends IntelligentSensorInference {
  constructor(device, options = {}) {
    super(device, {
      maxTempJump: options.maxTempJump || 5,
      maxHumidityJump: options.maxHumidityJump || 15,
      correlationWindow: options.correlationWindow || 300000,
      ...options
    });
    this._lastValidTemp = null;
    this._lastValidHumidity = null;
    this._erraticReadingCount = 0;
  }

  validateTemperature(rawTemp) {
    const now = Date.now();
    this.recordValue('temp_raw', rawTemp, now);
    if (rawTemp < -40 || rawTemp > 80) {
      this._erraticReadingCount++;
      return this._lastValidTemp;
    }
    if (this._lastValidTemp !== null) {
      const jump = Math.abs(rawTemp - this._lastValidTemp);
      const lastReading = this._lastValues.get('temp_validated');
      const timeSinceLast = lastReading ? (now - lastReading.timestamp) / 1000 : 60;
      const allowedJump = Math.max(this.options.maxTempJump, safeDivide(timeSinceLast, 60));

      if (jump > allowedJump) {
        this._erraticReadingCount++;
        const direction = rawTemp > this._lastValidTemp ? 1 : -1;
        rawTemp = this._lastValidTemp + (direction * Math.min(jump, 2));
        this._confidence = Math.max(30, this._confidence - 10);
      }
    }
    this._lastValidTemp = rawTemp;
    this.recordValue('temp_validated', rawTemp, now);
    this._confidence = Math.min(100, this._confidence + 2);
    return rawTemp;
  }

  validateHumidity(rawHumidity) {
    const now = Date.now();
    this.recordValue('humidity_raw', rawHumidity, now);
    if (rawHumidity < 0 || rawHumidity > 100) {
      this._erraticReadingCount++;
      return this._lastValidHumidity;
    }
    if (this._lastValidHumidity !== null) {
      const jump = Math.abs(rawHumidity - this._lastValidHumidity);
      const lastReading = this._lastValues.get('humidity_validated');
      const timeSinceLast = lastReading ? (now - lastReading.timestamp) / 1000 : 60;
      const allowedJump = Math.max(this.options.maxHumidityJump, safeDivide(timeSinceLast, 30));

      if (jump > allowedJump) {
        this._erraticReadingCount++;
        const direction = rawHumidity > this._lastValidHumidity ? 1 : -1;
        rawHumidity = this._lastValidHumidity + (direction * Math.min(jump, 5));
        this._confidence = Math.max(30, this._confidence - 10);
      }
    }
    this._lastValidHumidity = rawHumidity;
    this.recordValue('humidity_validated', rawHumidity, now);
    this._confidence = Math.min(100, this._confidence + 2);
    return rawHumidity;
  }

  checkCorrelation() {
    if (this._lastValidTemp === null || this._lastValidHumidity === null) return true;
    if (this._lastValidHumidity > 95 && (this._lastValidTemp < 0 || this._lastValidTemp > 40)) return false;
    return true;
  }

  getSensorHealth() {
    return { 
      erraticReadings: this._erraticReadingCount, 
      confidence: this.getConfidence(), 
      isHealthy: this._erraticReadingCount < 5 && this._confidence > 50 
    };
  }

  compensateInternalHeat(rawTemp) {
    let penalty = 0;
    if (this.device.driver.id.includes('switch') || this.device.driver.id.includes('plug')) {
      if (this.device.getCapabilityValue('onoff')) penalty = 1.5;
    }
    return rawTemp - penalty;
  }

  calculateTPIDutyCycle(currentTemp, targetTemp) {
    const error = targetTemp - currentTemp;
    if (error <= 0) return 0;
    if (error > 2) return 1;
    return error / 2;
  }
}

class SoilMoistureInference extends IntelligentSensorInference {
  constructor(device, options = {}) {
    super(device, {
      maxMoistureJump: options.maxMoistureJump || 20,
      dryThreshold: options.dryThreshold || 20,
      wetThreshold: options.wetThreshold || 80,
      ...options
    });
    this._lastValidMoisture = null;
    this._trendDirection = 0;
  }

  validateMoisture(rawMoisture, temperature = null) {
    const now = Date.now();
    this.recordValue('moisture_raw', rawMoisture, now);
    if (rawMoisture < 0 || rawMoisture > 100) return this._lastValidMoisture;
    if (this._lastValidMoisture !== null) {
      const jump = Math.abs(rawMoisture - this._lastValidMoisture);
      if (jump > this.options.maxMoistureJump) {
        if (!this.hasRecentActivity('temperature') && jump > 40) {
          rawMoisture = this._lastValidMoisture + (rawMoisture > this._lastValidMoisture ? 5 : -5);
          this._confidence = Math.max(30, this._confidence - 15);
        }
      }
    }
    if (this._lastValidMoisture !== null) {
      this._trendDirection = rawMoisture > this._lastValidMoisture + 2 ? 1 : (rawMoisture < this._lastValidMoisture - 2 ? -1 : 0);
    }
    this._lastValidMoisture = rawMoisture;
    this.recordValue('moisture_validated', rawMoisture, now);
    if (temperature !== null) this.recordValue('temperature', temperature, now);
    return rawMoisture;
  }

  predictWateringNeed() {
    if (this._lastValidMoisture === null) return null;
    if (this._lastValidMoisture < this.options.dryThreshold) return { needed: true, urgency: 'high', message: 'Soil is dry' };
    if (this._lastValidMoisture < 40 && this._trendDirection === -1) return { needed: true, urgency: 'medium', message: 'Soil drying' };
    return { needed: false, urgency: 'none', message: 'Moisture OK' };
  }
}

class AirQualityInference extends IntelligentSensorInference {
  constructor(device, options = {}) {
    super(device, { co2Baseline: options.co2Baseline || 400, ...options });
    this._lastCO2 = null;
    this._lastVOC = null;
    this._lastPM25 = null;
  }

  validateCO2(rawCO2, vocValue = null) {
    const now = Date.now();
    this.recordValue('co2_raw', rawCO2, now);
    if (rawCO2 < 300 || rawCO2 > 10000) return this._lastCO2;
    this._lastCO2 = rawCO2;
    this.recordValue('co2_validated', rawCO2, now);
    return rawCO2;
  }

  calculateAQI() {
    let aqi = 0, factors = 0;
    if (this._lastCO2 !== null) { 
      aqi += Math.min(500, (this._lastCO2 - 400) * 4); 
      factors++; 
    }
    if (this._lastPM25 !== null) { 
      aqi += Math.min(500, this._lastPM25 * 4); 
      factors++; 
    }
    if (this._lastVOC !== null) { 
      aqi += Math.min(500, this._lastVOC / 4); 
      factors++; 
    }
    return factors > 0 ? safeDivide(Math.round(aqi), factors) : null;
  }

  updateVOC(value) { this._lastVOC = value; this.recordValue('voc', value); }
  updatePM25(value) { this._lastPM25 = value; this.recordValue('pm25', value); }
}

class BatteryInference extends IntelligentSensorInference {
  constructor(device, options = {}) {
    super(device, { 
      lowBatteryThreshold: options.lowBatteryThreshold || 20, 
      criticalBatteryThreshold: options.criticalBatteryThreshold || 10, 
      ...options 
    });
    this._lastBattery = null;
    this._dischargeRate = null;
  }

  validateBattery(rawBattery) {
    const now = Date.now();
    if (rawBattery < 0 || rawBattery > 100) return this._lastBattery;
    if (this._lastBattery !== null && rawBattery < this._lastBattery) {
      const lastReading = this._lastValues.get('battery');
      if (lastReading) {
        const days = (now - lastReading.timestamp) / 86400000;
        if (days > 0) {
          const rate = (this._lastBattery - rawBattery) / days;
          this._dischargeRate = this._dischargeRate ? (this._dischargeRate * 0.7 + rate * 0.3) : rate;
        }
      }
    }
    this._lastBattery = rawBattery;
    this.recordValue('battery', rawBattery, now);
    return rawBattery;
  }

  predictDaysRemaining() {
    return (this._lastBattery !== null && this._dischargeRate > 0) ? Math.round(this._lastBattery / this._dischargeRate) : null;
  }

  getStatus() {
    if (this._lastBattery === null) return 'unknown';
    return this._lastBattery <= this.options.criticalBatteryThreshold ? 'critical' : (this._lastBattery <= this.options.lowBatteryThreshold ? 'low' : 'ok');
  }
}

class RadioSensingInference extends IntelligentSensorInference {
  constructor(device, options = {}) {
    super(device, { 
      lqiVarianceThreshold: options.lqiVarianceThreshold || 15, 
      activityWindow: options.activityWindow || 15000, 
      presenceHoldTime: options.presenceHoldTime || 60000, 
      ...options 
    });
    this._inferredPresence = false;
    this._lastPresenceTime = 0;
  }

  updateSignal(lqi, rssi = null) {
    const now = Date.now();
    this.recordValue('lqi', lqi, now);
    if (!this.hasRecentActivity('lqi', this.options.activityWindow)) return null;
    const history = (this._history.get('lqi') || []).filter(h => (now - h.timestamp) < this.options.activityWindow);
    const values = history.map(h => h.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length);

    if (stdDev > this.options.lqiVarianceThreshold) {
      this._inferredPresence = true;
      this._lastPresenceTime = now;
      this._confidence = Math.min(100, this._confidence + 20);
    }
    if (this._inferredPresence && (now - this._lastPresenceTime) > this.options.presenceHoldTime) {
      this._inferredPresence = false;
      this._confidence = Math.max(30, this._confidence - 10);
    }
    return this._inferredPresence;
  }
}

class MaintenancePredictionInference extends IntelligentSensorInference {
  constructor(device, options = {}) { 
    super(device, options); 
    this._errorCount = 0; 
    this._lastCheckIn = Date.now(); 
  }
  recordError() { this._errorCount++; this._confidence = Math.max(0, this._confidence - 15); }
  recordCheckIn() { this._lastCheckIn = Date.now(); this._confidence = Math.min(100, this._confidence + 5); }
  getHealthScore() {
    const hours = (Date.now() - this._lastCheckIn) / 3600000;
    let score = this._confidence;
    if (hours > 12) score = Math.max(0, score - (hours * 4));
    score -= (this._errorCount * 12);
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

module.exports = { 
  IntelligentSensorInference, 
  MotionLuxInference, 
  ClimateInference, 
  SoilMoistureInference, 
  AirQualityInference, 
  BatteryInference, 
  RadioSensingInference, 
  MaintenancePredictionInference 
};
