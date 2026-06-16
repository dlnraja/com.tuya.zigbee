'use strict';

/**
 * PredictiveHealthEngine - Device Health Trend Analysis
 * FEATURE #86
 *
 * Analyzes device health trends for predictive maintenance:
 *   - Battery drain rate prediction
 *   - Signal degradation detection
 *   - Failure probability estimation
 *   - Anomaly detection in sensor patterns
 *   - Health score calculation with weighting
 *   - Proactive alert generation
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

const HOUR_MS = 3600000;
const DAY_MS = 86400000;

class PredictiveHealthEngine extends EventEmitter {
  constructor(homey, options = {}) {
    super();
    this.homey = homey;
    this.analysisIntervalMs = options.analysisIntervalMs || 3600000; // 1 hour
    this._analysisTimer = null;
    this._destroyed = false;

    // Device health data: deviceId -> { metrics history }
    this._deviceMetrics = new Map();
    this._maxHistoryPerDevice = options.maxHistoryPerDevice || 288; // 7 days at 5-min intervals
    this._alertHistory = new Map(); // deviceId -> [{ timestamp, type, message }]
    this._maxAlertsPerDevice = 50;
  }

  /* ------------------------------------------------------------------ */
  /*  Lifecycle                                                          */
  /* ------------------------------------------------------------------ */

  start() {
    if (this._analysisTimer) return;
    this._analysisTimer = setInterval(() => {
      if (this._destroyed) { this.stop(); return; }
      this._runAnalysis();
    }, this.analysisIntervalMs);
    this.homey.log('[PredictiveHealth] Analysis started');
  }

  stop() {
    if (this._analysisTimer) {
      clearInterval(this._analysisTimer);
      this._analysisTimer = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Data recording                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Record a health metric for a device.
   *
   * @param {string} deviceId
   * @param {Object} metrics
   * @param {number} [metrics.batteryPercent]
   * @param {number} [metrics.batteryVoltage]
   * @param {number} [metrics.rssi]            - Signal strength dBm
   * @param {number} [metrics.lqi]             - Link quality indicator
   * @param {number} [metrics.responseTimeMs]  - Last command response time
   * @param {number} [metrics.errorCount]      - Cumulative error count
   * @param {number} [metrics.rebootCount]     - Cumulative reboot count
   */
  recordMetrics(deviceId, metrics) {
    if (this._destroyed) return;

    if (!this._deviceMetrics.has(deviceId)) {
      this._deviceMetrics.set(deviceId, { history: [], metadata: {} });
    }

    const device = this._deviceMetrics.get(deviceId);
    device.history.push({
      timestamp: Date.now(),
      ...metrics
    });

    // Trim old entries
    if (device.history.length > this._maxHistoryPerDevice) {
      device.history.shift();
    }
  }

  /**
   * Set device metadata for better prediction.
   * @param {string} deviceId
   * @param {Object} metadata
   * @param {string} [metadata.batteryType] - '3V_CR2032', 'AA', 'AAA', etc.
   * @param {number} [metadata.expectedBatteryLifeDays]
   * @param {string} [metadata.deviceType] - 'sensor', 'switch', 'thermostat', etc.
   */
  setDeviceMetadata(deviceId, metadata) {
    if (!this._deviceMetrics.has(deviceId)) {
      this._deviceMetrics.set(deviceId, { history: [], metadata: {} });
    }
    Object.assign(this._deviceMetrics.get(deviceId).metadata, metadata);
  }

  /* ------------------------------------------------------------------ */
  /*  Analysis                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Get health analysis for a specific device.
   * @param {string} deviceId
   * @returns {Object} Health analysis report
   */
  analyzeDevice(deviceId) {
    const device = this._deviceMetrics.get(deviceId);
    if (!device || device.history.length === 0) {
      return { deviceId, status: 'no_data', score: 0 };
    }

    const recent = device.history.slice(-24); // Last 24 readings
    const older = device.history.slice(0, -24);

    const batteryAnalysis = this._analyzeBatteryTrend(recent, older, device.metadata);
    const signalAnalysis = this._analyzeSignalTrend(recent, older);
    const reliabilityAnalysis = this._analyzeReliability(recent);
    const anomalyAnalysis = this._detectAnomalies(recent);

    const score = this._calculateHealthScore(batteryAnalysis, signalAnalysis, reliabilityAnalysis);

    return {
      deviceId,
      score: Math.round(score),
      status: score >= 80 ? 'healthy' : score >= 50 ? 'degraded' : 'critical',
      battery: batteryAnalysis,
      signal: signalAnalysis,
      reliability: reliabilityAnalysis,
      anomalies: anomalyAnalysis,
      alerts: this._alertHistory.get(deviceId) || [],
      analyzedAt: new Date().toISOString()
    };
  }

  /**
   * Get health summary for all tracked devices.
   * @returns {Object}
   */
  getSystemHealthSummary() {
    const devices = {};
    let totalScore = 0;
    let count = 0;

    for (const [deviceId] of this._deviceMetrics) {
      const analysis = this.analyzeDevice(deviceId);
      devices[deviceId] = {
        score: analysis.score,
        status: analysis.status
      };
      totalScore += analysis.score;
      count++;
    }

    return {
      overallScore: count > 0 ? Math.round(totalScore / count) : 100,
      deviceCount: count,
      healthy: Object.values(devices).filter(d => d.status === 'healthy').length,
      degraded: Object.values(devices).filter(d => d.status === 'degraded').length,
      critical: Object.values(devices).filter(d => d.status === 'critical').length,
      devices
    };
  }

  /**
   * Predict battery remaining life in days.
   * @param {string} deviceId
   * @returns {number|null} Estimated days, or null if insufficient data
   */
  predictBatteryLife(deviceId) {
    const device = this._deviceMetrics.get(deviceId);
    if (!device || device.history.length < 3) return null;

    const readings = device.history.filter(h => h.batteryPercent !== undefined);
    if (readings.length < 3) return null;

    // Calculate drain rate using linear regression
    const n = readings.length;
    const times = readings.map(r => r.timestamp);
    const values = readings.map(r => r.batteryPercent);
    const t0 = times[0];

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      const x = (times[i] - t0) / HOUR_MS; // hours from start
      const y = values[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    if (slope >= 0) return Infinity; // Battery not draining

    const currentBattery = values[values.length - 1];
    const drainRatePerHour = Math.abs(slope);
    const remainingHours = currentBattery / drainRatePerHour;

    return Math.round(remainingHours / 24 * 10) / 10; // Days with 1 decimal
  }

  /* ------------------------------------------------------------------ */
  /*  Internal analyzers                                                 */
  /* ------------------------------------------------------------------ */

  _analyzeBatteryTrend(recent, older, metadata) {
    const recentBatteries = recent.filter(h => h.batteryPercent !== undefined);
    const olderBatteries = older.filter(h => h.batteryPercent !== undefined);

    if (recentBatteries.length === 0) {
      return { trend: 'unknown', currentLevel: null, drainRate: null, daysRemaining: null };
    }

    const currentLevel = recentBatteries[recentBatteries.length - 1].batteryPercent;
    const avgRecent = recentBatteries.reduce((s, r) => s + r.batteryPercent, 0) / recentBatteries.length;
    const avgOlder = olderBatteries.length > 0
      ? olderBatteries.reduce((s, r) => s + r.batteryPercent, 0) / olderBatteries.length
      : avgRecent;

    const trend = avgRecent < avgOlder - 2 ? 'declining' : avgRecent > avgOlder + 2 ? 'improving' : 'stable';
    const drainRate = avgOlder - avgRecent; // Per analysis period

    const daysRemaining = this.predictBatteryLife(recent[0]?.deviceId || '');

    let alert = null;
    if (currentLevel <= 10) {
      alert = { type: 'battery_critical', message: `Battery at ${currentLevel}%`, severity: 'critical' };
    } else if (currentLevel <= 20) {
      alert = { type: 'battery_low', message: `Battery at ${currentLevel}%`, severity: 'warning' };
    }

    if (alert) this._recordAlert(recent[0]?.deviceId || '', alert);

    return {
      trend,
      currentLevel,
      drainRate: Math.round(drainRate * 100) / 100,
      daysRemaining,
      alert
    };
  }

  _analyzeSignalTrend(recent, older) {
    const recentRSSI = recent.filter(h => h.rssi !== undefined);
    const olderRSSI = older.filter(h => h.rssi !== undefined);

    if (recentRSSI.length === 0) {
      return { trend: 'unknown', currentRSSI: null, currentLQI: null, quality: 'unknown' };
    }

    const avgRecent = recentRSSI.reduce((s, r) => s + r.rssi, 0) / recentRSSI.length;
    const avgOlder = olderRSSI.length > 0
      ? olderRSSI.reduce((s, r) => s + r.rssi, 0) / olderRSSI.length
      : avgRecent;

    const trend = avgRecent < avgOlder - 3 ? 'degrading' : avgRecent > avgOlder + 3 ? 'improving' : 'stable';

    let quality;
    if (avgRecent > -50) quality = 'excellent';
    else if (avgRecent > -70) quality = 'good';
    else if (avgRecent > -85) quality = 'fair';
    else quality = 'poor';

    const currentLQI = recent.filter(h => h.lqi !== undefined).slice(-1)[0]?.lqi;

    if (quality === 'poor') {
      this._recordAlert(recent[0]?.deviceId || '', {
        type: 'signal_poor',
        message: `RSSI ${Math.round(avgRecent)}dBm (${quality})`,
        severity: 'warning'
      });
    }

    return {
      trend,
      currentRSSI: Math.round(avgRecent * 10) / 10,
      currentLQI,
      quality
    };
  }

  _analyzeReliability(recent) {
    if (recent.length === 0) return { errorRate: 0, uptime: 100 };

    const totalErrors = recent.reduce((s, r) => s + (r.errorCount || 0), 0);
    const prevErrors = recent.length > 1 ? recent[0].errorCount || 0 : 0;
    const deltaErrors = totalErrors - prevErrors;
    const errorRate = recent.length > 0 ? deltaErrors / recent.length : 0;

    return {
      errorRate: Math.round(errorRate * 10000) / 100,
      uptime: Math.round((1 - errorRate) * 10000) / 100
    };
  }

  _detectAnomalies(recent) {
    const anomalies = [];
    const temperatures = recent.filter(h => h.temperature !== undefined);

    if (temperatures.length >= 5) {
      const values = temperatures.map(h => h.temperature);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
      const stddev = Math.sqrt(variance);

      const lastValue = values[values.length - 1];
      if (Math.abs(lastValue - mean) > 3 * stddev && stddev > 0) {
        anomalies.push({
          type: 'statistical_outlier',
          capability: 'temperature',
          value: lastValue,
          expected: Math.round(mean * 10) / 10,
          stddev: Math.round(stddev * 10) / 10
        });
      }
    }

    return anomalies;
  }

  _calculateHealthScore(battery, signal, reliability) {
    let score = 100;

    // Battery impact (0-30 points)
    if (battery.currentLevel !== null) {
      if (battery.currentLevel <= 10) score -= 30;
      else if (battery.currentLevel <= 20) score -= 20;
      else if (battery.currentLevel <= 30) score -= 10;
    }
    if (battery.trend === 'declining') score -= 5;

    // Signal impact (0-25 points)
    if (signal.quality === 'poor') score -= 25;
    else if (signal.quality === 'fair') score -= 10;
    else if (signal.trend === 'degrading') score -= 5;

    // Reliability impact (0-25 points)
    if (reliability.uptime < 90) score -= 25;
    else if (reliability.uptime < 95) score -= 15;
    else if (reliability.uptime < 99) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  _recordAlert(deviceId, alert) {
    if (!this._alertHistory.has(deviceId)) {
      this._alertHistory.set(deviceId, []);
    }
    const alerts = this._alertHistory.get(deviceId);

    // Deduplicate: don't repeat same alert within 1 hour
    const recent = alerts.filter(a => a.type === alert.type && (Date.now() - a.timestamp) < HOUR_MS);
    if (recent.length === 0) {
      alerts.push({ ...alert, timestamp: Date.now() });
      if (alerts.length > this._maxAlertsPerDevice) alerts.shift();
      this.emit('alert', { deviceId, ...alert });
    }
  }

  _runAnalysis() {
    for (const [deviceId] of this._deviceMetrics) {
      const analysis = this.analyzeDevice(deviceId);
      if (analysis.status === 'critical') {
        this.emit('deviceCritical', { deviceId, analysis });
      }
    }
  }

  /**
   * Destroy and cleanup.
   */
  destroy() {
    this._destroyed = true;
    this.stop();
    this._deviceMetrics.clear();
    this._alertHistory.clear();
    this.removeAllListeners();
  }
}

module.exports = PredictiveHealthEngine;
