'use strict';

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
    // Count total metrics
    let totalMetrics = 0;
    for (const data of this.metrics.values()) {
      totalMetrics += data.length;
    }
    
    // If exceeded, remove oldest metrics
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
    
    // Limit number of tracked devices
    if (this.metrics.size > this.maxDevices * 5) { // 5 metrics per device avg
      const firstKey = this.metrics.keys().next().value;
      this.metrics.delete(firstKey);
    }
  }
  
  /**
   * Track device metric
   */
  track(deviceId, metric, value) {
    const key = `${deviceId}:${metric}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const data = this.metrics.get(key);
    
    data.push({
      value,
      timestamp: Date.now()
    });
    
    // Keep only last N points (Homey Pro memory limit)
    while (data.length > this.maxMetricsPerDevice) {
      data.shift();
    }
    
    // Enforce global limits
    this._enforceLimits();
  }
  
  /**
   * Get metric statistics
   */
  getStats(deviceId, metric) {
    const key = `${deviceId}:${metric}`;
    const data = this.metrics.get(key);
    
    if (!data || data.length === 0) {
      return null;
    }
    
    const values = data.map(d => d.value);
    
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      latest: values[values.length - 1],
      trend: this.calculateTrend(values)
    };
  }
  
  /**
   * Calculate trend
   */
  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const recent = values.slice(-10);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const older = values.slice(-20, -10);
    const oldAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const change = ((avg - oldAvg) / oldAvg) * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }
  
  /**
   * Predict battery life
   */
  predictBatteryLife(deviceId) {
    const stats = this.getStats(deviceId, 'battery');
    if (!stats || stats.trend !== 'decreasing') {
      return null;
    }
    
    const key = `${deviceId}:battery`;
    const data = this.metrics.get(key);
    
    // Simple linear regression
    const recent = data.slice(-50);
    if (recent.length < 10) return null;
    
    const x = recent.map((_, i) => i);
    const y = recent.map(d => d.value);
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Predict when battery reaches 0%
    if (slope >= 0) return null;
    
    const daysUntilEmpty = -intercept / slope;
    
    return {
      daysRemaining: Math.round(daysUntilEmpty),
      confidence: slope < -0.5 ? 'high' : 'medium'
    };
  }
  
  /**
   * Device reliability score
   */
  calculateReliability(deviceId) {
    // Based on: uptime, error rate, response time
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
