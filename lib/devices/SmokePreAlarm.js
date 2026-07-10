'use strict';

/**
 * Smoke Pre-Alarm - DEVICE #37
 *
 * Early warning system for smoke/CO detectors using:
 * - Trend analysis (gradual rise in smoke density)
 * - Pre-alarm thresholds before critical alarm
 * - Multi-sensor fusion (smoke + CO + temperature)
 * - Alert escalation levels
 * - False positive reduction
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class SmokePreAlarm extends EventEmitter {
  constructor(device, options = {}) {
    super();
    this.device = device;

    // DP mappings
    this.dpMapping = options.dpMapping || {
      SMOKE_DENSITY: 1,     // Smoke density level (0-100)
      CO_LEVEL: 2,          // Carbon monoxide level (ppm)
      TEMPERATURE: 3,       // Temperature (optional, for multi-sensor)
      ALARM_STATE: 4,       // Current alarm state
      ALARM_COMMAND: 5      // Silence/test command
    };

    // Thresholds
    this.thresholds = {
      preAlarmSmoke: options.preAlarmSmoke || 15,     // Pre-alarm smoke density
      alarmSmoke: options.alarmSmoke || 30,            // Full alarm smoke density
      preAlarmCO: options.preAlarmCO || 30,            // Pre-alarm CO (ppm)
      alarmCO: options.alarmCO || 70,                  // Full alarm CO (ppm)
      temperatureRise: options.temperatureRise || 5,   // Rapid temp rise (degrees/min)
      highTemp: options.highTemp || 57                  // High temperature threshold (C)
    };

    // State
    this.currentSmokeDensity = 0;
    this.currentCO = 0;
    this.currentTemperature = 0;
    this.alarmLevel = 'clear'; // 'clear' | 'pre_alarm' | 'alarm' | 'critical'

    // Trend analysis
    this._history = []; // { timestamp, smoke, co, temp }
    this._maxHistory = options.maxHistory || 60; // 60 data points

    // Cooldowns
    this._lastPreAlarm = 0;
    this._lastAlarm = 0;
    this._alertCooldownMs = options.alertCooldownMs || 60000; // 1 minute

    // False positive reduction
    this._consecutivePreAlarm = 0;
    this._consecutiveAlarm = 0;
    this._preAlarmConfirmCount = options.preAlarmConfirmCount || 3;
    this._alarmConfirmCount = options.alarmConfirmCount || 2;
  }

  /**
   * Handle smoke density report
   * @param {number} density - 0-100
   */
  handleSmokeReport(density) {
    this.currentSmokeDensity = Math.max(0, Math.min(100, density));
    this._recordDataPoint();
    this._evaluateAlarmState();
  }

  /**
   * Handle CO level report
   * @param {number} ppm - CO in parts per million
   */
  handleCOReport(ppm) {
    this.currentCO = Math.max(0, ppm);
    this._recordDataPoint();
    this._evaluateAlarmState();
  }

  /**
   * Handle temperature report
   * @param {number} temp - Temperature in Celsius
   */
  handleTemperatureReport(temp) {
    this.currentTemperature = temp;
    this._recordDataPoint();
    this._evaluateAlarmState();
  }

  /**
   * Handle raw alarm state from device
   * @param {boolean|string} state
   */
  handleAlarmState(state) {
    if (state === true || state === 'alarm' || state === 1) {
      this.alarmLevel = 'alarm';
      this.emit('alarmTriggered', {
        smokeDensity: this.currentSmokeDensity,
        co: this.currentCO,
        temperature: this.currentTemperature,
        source: 'device_report'
      });
    } else {
      if (this.alarmLevel !== 'clear') {
        this.emit('alarmCleared', {
          timestamp: Date.now(),
          previousLevel: this.alarmLevel
        });
      }
      this.alarmLevel = 'clear';
      this._consecutivePreAlarm = 0;
      this._consecutiveAlarm = 0;
    }
  }

  /**
   * Silence the alarm
   */
  async silenceAlarm() {
    try {
      await this._sendDP(this.dpMapping.ALARM_COMMAND, 'silence');
      this.emit('alarmSilenced', { timestamp: Date.now() });
    } catch (err) {
      this.device.error('[SmokePreAlarm] Silence command failed:', err.message);
    }
  }

  /**
   * Run self-test
   */
  async runSelfTest() {
    try {
      await this._sendDP(this.dpMapping.ALARM_COMMAND, 'test');
      this.emit('selfTestStarted', { timestamp: Date.now() });
    } catch (err) {
      this.device.error('[SmokePreAlarm] Self-test failed:', err.message);
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      alarmLevel: this.alarmLevel,
      smokeDensity: this.currentSmokeDensity,
      coLevel: this.currentCO,
      temperature: this.currentTemperature,
      trend: this._calculateTrend(),
      thresholds: { ...this.thresholds }
    };
  }

  /**
   * Evaluate alarm state from current readings and trends
   */
  _evaluateAlarmState() {
    const now = Date.now();
    let newLevel = 'clear';
    let reasons = [];

    // Check smoke density
    if (this.currentSmokeDensity >= this.thresholds.alarmSmoke) {
      newLevel = 'alarm';
      reasons.push(`smoke=${this.currentSmokeDensity}>=${this.thresholds.alarmSmoke}`);
    } else if (this.currentSmokeDensity >= this.thresholds.preAlarmSmoke) {
      if (newLevel === 'clear') newLevel = 'pre_alarm';
      reasons.push(`smoke=${this.currentSmokeDensity}>=${this.thresholds.preAlarmSmoke}`);
    }

    // Check CO level
    if (this.currentCO >= this.thresholds.alarmCO) {
      newLevel = 'alarm';
      reasons.push(`co=${this.currentCO}>=${this.thresholds.alarmCO}`);
    } else if (this.currentCO >= this.thresholds.preAlarmCO) {
      if (newLevel === 'clear') newLevel = 'pre_alarm';
      reasons.push(`co=${this.currentCO}>=${this.thresholds.preAlarmCO}`);
    }

    // Check rapid temperature rise (trend-based)
    const tempTrend = this._calculateTempRiseRate();
    if (tempTrend > this.thresholds.temperatureRise) {
      if (newLevel === 'clear') newLevel = 'pre_alarm';
      reasons.push(`temp_rise=${tempTrend.toFixed(1)}/min`);
    }

    // Check high temperature
    if (this.currentTemperature >= this.thresholds.highTemp) {
      if (newLevel === 'clear') newLevel = 'pre_alarm';
      reasons.push(`temp=${this.currentTemperature}>=${this.thresholds.highTemp}`);
    }

    // False positive reduction: require consecutive readings
    if (newLevel === 'pre_alarm') {
      this._consecutivePreAlarm++;
      this._consecutiveAlarm = 0;

      if (this._consecutivePreAlarm < this._preAlarmConfirmCount) {
        newLevel = 'clear'; // Not enough consecutive readings yet
      }
    } else if (newLevel === 'alarm') {
      this._consecutiveAlarm++;
      this._consecutivePreAlarm = 0;

      if (this._consecutiveAlarm < this._alarmConfirmCount) {
        newLevel = this.alarmLevel === 'alarm' ? 'alarm' : 'pre_alarm'; // Escalate gradually
      }
    } else {
      this._consecutivePreAlarm = 0;
      this._consecutiveAlarm = 0;
    }

    // State transitions
    if (newLevel !== this.alarmLevel) {
      const previous = this.alarmLevel;
      this.alarmLevel = newLevel;

      if (newLevel === 'pre_alarm' && now - this._lastPreAlarm > this._alertCooldownMs) {
        this._lastPreAlarm = now;
        this.emit('preAlarm', {
          smokeDensity: this.currentSmokeDensity,
          co: this.currentCO,
          temperature: this.currentTemperature,
          reasons,
          trend: this._calculateTrend()
        });
      }

      if (newLevel === 'alarm' && now - this._lastAlarm > this._alertCooldownMs) {
        this._lastAlarm = now;
        this.emit('alarmTriggered', {
          smokeDensity: this.currentSmokeDensity,
          co: this.currentCO,
          temperature: this.currentTemperature,
          reasons,
          previousLevel: previous
        });
      }

      if (newLevel === 'clear' && previous !== 'clear') {
        this.emit('alarmCleared', {
          previousLevel: previous,
          timestamp: now
        });
      }

      this.emit('alarmLevelChanged', { previous, current: newLevel, reasons });
    }
  }

  /**
   * Record a data point for trend analysis
   */
  _recordDataPoint() {
    this._history.push({
      timestamp: Date.now(),
      smoke: this.currentSmokeDensity,
      co: this.currentCO,
      temp: this.currentTemperature
    });

    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  /**
   * Calculate smoke density trend
   * @returns {string} 'rising' | 'falling' | 'stable' | 'unknown'
   */
  _calculateTrend() {
    if (this._history.length < 5) return 'unknown';

    const recent = this._history.slice(-5);
    const older = this._history.slice(-10, -5);

    if (older.length === 0) return 'unknown';

    const recentAvg = recent.reduce((s, h) => s + h.smoke, 0) / recent.length;
    const olderAvg = older.reduce((s, h) => s + h.smoke, 0) / older.length;

    const diff = recentAvg - olderAvg;
    if (diff > 2) return 'rising';
    if (diff < -2) return 'falling';
    return 'stable';
  }

  /**
   * Calculate temperature rise rate (degrees per minute)
   */
  _calculateTempRiseRate() {
    if (this._history.length < 2) return 0;

    const now = Date.now();
    const oneMinAgo = now - 60000;

    const recent = this._history.filter(h => h.timestamp >= oneMinAgo);
    if (recent.length < 2) return 0;

    const first = recent[0];
    const last = recent[recent.length - 1];
    const elapsedMin = (last.timestamp - first.timestamp) / 60000;

    if (elapsedMin <= 0) return 0;

    return (last.temp - first.temp) / elapsedMin;
  }

  async _sendDP(dpId, value) {
    try {
      if (this.device.sendTuyaDataPoint) {
        await this.device.sendTuyaDataPoint(dpId, value);
      } else if (this.device.tuyaEF00Manager) {
        await this.device.tuyaEF00Manager.setDP(dpId, value);
      }
    } catch (err) {
      throw err;
    }
  }
}

module.exports = SmokePreAlarm;
