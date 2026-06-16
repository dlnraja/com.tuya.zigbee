'use strict';

/**
 * Visual Battery Health Indicator - UX #92
 *
 * Provides rich battery health information for display:
 * - Health score (0-100)
 * - Trend analysis (charging/discharging/stable)
 * - Estimated remaining life
 * - Color-coded status levels
 * - Battery degradation tracking
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class VisualBatteryHealthIndicator extends EventEmitter {
  constructor(homey, options = {}) {
    super();
    this.homey = homey;

    // Battery state tracking
    this._batteries = new Map(); // deviceId -> battery state

    // Thresholds
    this.criticalThreshold = options.criticalThreshold || 10;
    this.lowThreshold = options.lowThreshold || 25;
    this.goodThreshold = options.goodThreshold || 50;
    this.replacementThreshold = options.replacementThreshold || 60; // Days to suggest replacement

    // Trend analysis
    this._trendWindowDays = options.trendWindowDays || 30;
    this._maxHistory = options.maxHistory || 100;
  }

  /**
   * Update battery reading for a device
   * @param {string} deviceId
   * @param {number} percentage - 0-100
   * @param {number} [voltage] - Battery voltage in mV
   * @param {number} [temperature] - Battery temperature in C (if available)
   */
  updateBattery(deviceId, percentage, voltage = null, temperature = null) {
    let battery = this._batteries.get(deviceId);

    if (!battery) {
      battery = {
        deviceId,
        percentage: 100,
        voltage: null,
        temperature: null,
        history: [],
        firstSeen: Date.now(),
        lastUpdated: Date.now(),
        replacementSuggested: false
      };
      this._batteries.set(deviceId, battery);
    }

    // Update values
    const previousPercentage = battery.percentage;
    battery.percentage = Math.max(0, Math.min(100, percentage));
    battery.voltage = voltage;
    battery.temperature = temperature;
    battery.lastUpdated = Date.now();

    // Add to history
    battery.history.push({
      timestamp: Date.now(),
      percentage: battery.percentage,
      voltage
    });

    // Trim history
    if (battery.history.length > this._maxHistory) {
      battery.history = battery.history.slice(-this._maxHistory);
    }

    // Check for significant changes
    if (previousPercentage !== battery.percentage) {
      this.emit('batteryChanged', {
        deviceId,
        previous: previousPercentage,
        current: battery.percentage,
        change: battery.percentage - previousPercentage
      });
    }

    // Check thresholds
    this._checkThresholds(deviceId, battery);
  }

  /**
   * Get battery health info for a device
   * @param {string} deviceId
   * @returns {Object}
   */
  getBatteryHealth(deviceId) {
    const battery = this._batteries.get(deviceId);
    if (!battery) return null;

    const healthScore = this._calculateHealthScore(battery);
    const trend = this._calculateTrend(battery);
    const estimatedDays = this._estimateRemainingDays(battery);
    const status = this._getStatusLevel(battery.percentage);

    return {
      deviceId,
      percentage: battery.percentage,
      voltage: battery.voltage,
      temperature: battery.temperature,
      healthScore,
      trend,
      estimatedDaysRemaining: estimatedDays,
      status,
      statusLabel: this._getStatusLabel(status),
      statusColor: this._getStatusColor(status),
      lastUpdated: battery.lastUpdated,
      ageDays: Math.floor((Date.now() - battery.firstSeen) / (24 * 60 * 60 * 1000)),
      replacementSuggested: battery.replacementSuggested || estimatedDays <= this.replacementThreshold,
      history: battery.history.slice(-20) // Last 20 data points
    };
  }

  /**
   * Get all batteries summary
   * @returns {Object}
   */
  getAllBatteriesSummary() {
    const devices = [];
    let criticalCount = 0;
    let lowCount = 0;
    let healthyCount = 0;

    for (const [deviceId] of this._batteries.entries()) {
      const health = this.getBatteryHealth(deviceId);
      if (!health) continue;

      devices.push({
        deviceId: health.deviceId,
        percentage: health.percentage,
        healthScore: health.healthScore,
        status: health.status,
        statusColor: health.statusColor,
        trend: health.trend,
        estimatedDaysRemaining: health.estimatedDaysRemaining
      });

      if (health.status === 'critical') criticalCount++;
      else if (health.status === 'low') lowCount++;
      else healthyCount++;
    }

    return {
      totalDevices: devices.length,
      criticalCount,
      lowCount,
      healthyCount,
      needsAttention: criticalCount + lowCount,
      devices: devices.sort((a, b) => a.percentage - b.percentage)
    };
  }

  /**
   * Get health report as text for display
   */
  getHealthReport(deviceId) {
    const health = this.getBatteryHealth(deviceId);
    if (!health) return 'No battery data available';

    const lines = [];
    lines.push(`Battery: ${health.percentage}%`);
    lines.push(`Health Score: ${health.healthScore}/100`);
    lines.push(`Status: ${health.statusLabel}`);
    lines.push(`Trend: ${this._getTrendLabel(health.trend)}`);

    if (health.estimatedDaysRemaining !== null) {
      lines.push(`Est. Remaining: ~${health.estimatedDaysRemaining} days`);
    }

    if (health.voltage !== null) {
      lines.push(`Voltage: ${(health.voltage / 1000).toFixed(2)}V`);
    }

    if (health.replacementSuggested) {
      lines.push('');
      lines.push('** Battery replacement recommended **');
    }

    return lines.join('\n');
  }

  /**
   * Check if battery is below critical threshold
   */
  isCritical(deviceId) {
    const battery = this._batteries.get(deviceId);
    return battery ? battery.percentage <= this.criticalThreshold : false;
  }

  /**
   * Remove a device from tracking
   */
  removeDevice(deviceId) {
    this._batteries.delete(deviceId);
  }

  // ─── Internal ────────────────────────────────────────────────────────

  _calculateHealthScore(battery) {
    let score = battery.percentage;

    // Penalize for voltage drops
    if (battery.voltage !== null && battery.voltage < 2500) {
      score -= 10;
    }

    // Penalize for rapid discharge
    const trend = this._calculateTrend(battery);
    if (trend === 'discharging_fast') {
      score -= 15;
    }

    // Penalize for age
    const ageDays = (Date.now() - battery.firstSeen) / (24 * 60 * 60 * 1000);
    if (ageDays > 180) {
      score -= Math.min(20, Math.floor((ageDays - 180) / 30) * 5);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  _calculateTrend(battery) {
    if (battery.history.length < 3) return 'insufficient_data';

    const recent = battery.history.slice(-5);
    const first = recent[0].percentage;
    const last = recent[recent.length - 1].percentage;
    const change = last - first;
    const timeSpan = (recent[recent.length - 1].timestamp - recent[0].timestamp) / (60 * 60 * 1000); // hours

    if (timeSpan < 0.1) return 'stable';

    const ratePerHour = change / timeSpan;

    if (ratePerHour > 0.5) return 'charging';
    if (ratePerHour < -2) return 'discharging_fast';
    if (ratePerHour < -0.5) return 'discharging';
    return 'stable';
  }

  _estimateRemainingDays(battery) {
    if (battery.history.length < 3) return null;

    const recent = battery.history.slice(-10);
    const first = recent[0];
    const last = recent[recent.length - 1];

    const changePercent = first.percentage - last.percentage;
    const elapsedMs = last.timestamp - first.timestamp;

    if (changePercent <= 0 || elapsedMs <= 0) return null;

    const msPerPercent = elapsedMs / changePercent;
    const remainingMs = msPerPercent * last.percentage;

    return Math.max(0, Math.round(remainingMs / (24 * 60 * 60 * 1000)));
  }

  _getStatusLevel(percentage) {
    if (percentage <= this.criticalThreshold) return 'critical';
    if (percentage <= this.lowThreshold) return 'low';
    if (percentage <= this.goodThreshold) return 'moderate';
    return 'good';
  }

  _getStatusLabel(status) {
    const labels = {
      critical: 'Critical - Replace Now',
      low: 'Low - Plan Replacement',
      moderate: 'Moderate',
      good: 'Good'
    };
    return labels[status] || 'Unknown';
  }

  _getStatusColor(status) {
    const colors = {
      critical: '#FF0000',
      low: '#FF8800',
      moderate: '#FFCC00',
      good: '#00CC00'
    };
    return colors[status] || '#888888';
  }

  _getTrendLabel(trend) {
    const labels = {
      charging: 'Charging',
      discharging_fast: 'Discharging Quickly',
      discharging: 'Discharging',
      stable: 'Stable',
      insufficient_data: 'Insufficient Data'
    };
    return labels[trend] || 'Unknown';
  }

  _checkThresholds(deviceId, battery) {
    if (battery.percentage <= this.criticalThreshold) {
      this.emit('batteryCritical', {
        deviceId,
        percentage: battery.percentage,
        voltage: battery.voltage
      });
    } else if (battery.percentage <= this.lowThreshold) {
      this.emit('batteryLow', {
        deviceId,
        percentage: battery.percentage,
        voltage: battery.voltage
      });
    }

    const estimatedDays = this._estimateRemainingDays(battery);
    if (estimatedDays !== null && estimatedDays <= this.replacementThreshold && !battery.replacementSuggested) {
      battery.replacementSuggested = true;
      this.emit('replacementSuggested', {
        deviceId,
        estimatedDays,
        percentage: battery.percentage
      });
    }
  }
}

module.exports = VisualBatteryHealthIndicator;
