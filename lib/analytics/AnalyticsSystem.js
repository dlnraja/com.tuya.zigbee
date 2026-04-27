'use strict';
const { safeDivide, safeMultiply } = require('../utils/MathUtils.js');

/**
 * Advanced Analytics and Insights
 * Optimized for Homey Pro limits (512 MB RAM)
 * SDK3 COMPLIANT: Uses this.homey
 */

module.exports = class AnalyticsSystem {
  
  constructor(homey, options = {}) {
    this.homey = homey;
    this.metrics = new Map();
    
    // Homey Pro limits
    this.maxMetricsPerDevice = options.maxMetricsPerDevice || 100; // Max 100 points per metric
    this.maxDevices = options.maxDevices || 50; // Max 50 devices tracked
    this.maxTotalMetrics = options.maxTotalMetrics || 5000; // Max 5000 total data points
  }
  
  /**
   * Enforce memory limits
   */
  _enforceLimits() {
    let totalMetrics = 0;
    for (const data of this.metrics.values()) {
      totalMetrics += data.length;
    }
    
    while (totalMetrics > this.maxTotalMetrics && this.metrics.size > 0) {
      const firstKey = this.metrics.keys().next().value;
      const firstData = this.metrics.get(firstKey);
      if (firstData && firstData.length > 0) {
        firstData.shift();
        totalMetrics--;
      }
      if (firstData.length === 0) {
        this.metrics.delete(firstKey);
      }
    }
    
    if (this.metrics.size > safeMultiply(this.maxDevices, 5)) {
      const firstKey = this.metrics.keys().next().value;
      this.metrics.delete(firstKey);
    }
  }
  
  track(deviceId, metric, value) {
    const key = `${deviceId}:${metric}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const data = this.metrics.get(key);
    data.push({ value, timestamp: Date.now() });
    
    while (data.length > this.maxMetricsPerDevice) {
      data.shift();
    }
    this._enforceLimits();
  }
  
  getStats(deviceId, metric) {
    const key = `${deviceId}:${metric}`;
    const data = this.metrics.get(key);
    
    if (!data || data.length === 0) return null;
    
    const values = data.map(d => d.value);
    
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: safeDivide(values.reduce((a, b) => a + b, 0), values.length),
      latest: values[values.length - 1],
      trend: this.calculateTrend(values)
    };
  }
  
  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const recent = values.slice(-10);
    const recentAvg = safeDivide(recent.reduce((a, b) => a + b, 0), recent.length);
    const older = values.slice(-20, -10);
    const oldAvg = safeDivide(older.reduce((a, b) => a + b, 0), older.length);
    
    if (!oldAvg) return 'stable';
    const change = safeMultiply(safeDivide(recentAvg - oldAvg, oldAvg), 100);
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }
  
  predictBatteryLife(deviceId) {
    const stats = this.getStats(deviceId, 'battery');
    if (!stats || stats.trend !== 'decreasing') return null;
    
    const key = `${deviceId}:battery`;
    const data = this.metrics.get(key);
    const recent = data.slice(-50);
    if (recent.length < 10) return null;
    
    const x = recent.map((_, i) => i);
    const y = recent.map(d => d.value);
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + safeMultiply(xi, y[i]), 0);
    const sumX2 = x.reduce((sum, xi) => sum + safeMultiply(xi, xi), 0);
    
    const denominator = (safeMultiply(n, sumX2) - safeMultiply(sumX, sumX));
    if (denominator === 0) return null;

    const slope = safeDivide(safeMultiply(n, sumXY) - safeMultiply(sumX, sumY), denominator);
    const intercept = safeDivide(sumY - safeMultiply(slope, sumX), n);
    
    if (slope >= 0) return null;
    
    const daysUntilEmpty = safeDivide(-intercept, slope);
    
    return {
      daysRemaining: Math.round(daysUntilEmpty),
      confidence: slope < -0.5 ? 'high' : 'medium'
    };
  }
  
  calculateReliability(deviceId) {
    const uptime = this.getStats(deviceId, 'uptime');
    const errors = this.getStats(deviceId, 'errors');
    const response = this.getStats(deviceId, 'response_time');
    
    let score = 100;
    
    if (uptime && uptime.avg < 0.95) score -= 20;
    if (errors && errors.avg > 0.1) score -= 30;
    if (response && response.avg > 1000) score -= 10;
    
    return Math.max(0, score);
  }
};
