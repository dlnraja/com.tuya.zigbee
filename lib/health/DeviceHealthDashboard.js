'use strict';

const EventEmitter = require('events');

/**
 * DeviceHealthDashboard - v1.0.0
 * Comprehensive health summary and monitoring dashboard
 *
 * Features:
 * - Total device counts by status (healthy/stale/dead)
 * - Network health score calculation
 * - Battery warning aggregation
 * - Connectivity metrics
 * - Trend analysis for proactive maintenance
 */
class DeviceHealthDashboard extends EventEmitter {
  constructor(homey, healthMonitor) {
    super();
    this.homey = homey;
    this.healthMonitor = healthMonitor;

    // Cache for dashboard data
    this._cache = null;
    this._cacheTimestamp = 0;
    this.CACHE_TTL_MS = 30000; // 30 second cache

    // Battery thresholds
    this.BATTERY_LOW_THRESHOLD = 20; // %
    this.BATTERY_CRITICAL_THRESHOLD = 10; // %

    // Network health score weights
    this.SCORE_WEIGHTS = {
      connectivity: 0.4,
      battery: 0.2,
      freshness: 0.2,
      reliability: 0.2
    };
  }

  /**
   * Get complete health dashboard data
   * @param {boolean} forceRefresh - Skip cache
   * @returns {Object} Dashboard data
   */
  async getDashboard(forceRefresh = false) {
    const now = Date.now();

    // Return cached if fresh
    if (!forceRefresh && this._cache && (now - this._cacheTimestamp) < this.CACHE_TTL_MS) {
      return this._cache;
    }

    const dashboard = {
      timestamp: now,
      summary: await this._getDeviceSummary(),
      networkHealth: await this._calculateNetworkHealth(),
      batteryWarnings: await this._getBatteryWarnings(),
      connectivityIssues: await this._getConnectivityIssues(),
      topDevices: await this._getTopDevices(),
      recommendations: await this._getRecommendations()
    };

    // Update cache
    this._cache = dashboard;
    this._cacheTimestamp = now;

    return dashboard;
  }

  /**
   * Get device count summary by status
   * @private
   */
  async _getDeviceSummary() {
    const summary = {
      total: 0,
      healthy: 0,
      stale: 0,
      silent: 0,
      dead: 0,
      offline: 0,
      online: 0,
      byProtocol: { zigbee: 0, wifi: 0, unknown: 0 },
      byPowerType: { mains: 0, battery: 0, unknown: 0 }
    };

    try {
      const drivers = Object.values(this.homey.drivers.getDrivers());

      for (const driver of drivers) {
        const devices = driver.getDevices() || [];
        for (const device of devices) {
          summary.total++;

          // Determine protocol
          const protocol = this._detectProtocol(device);
          summary.byProtocol[protocol] = (summary.byProtocol[protocol] || 0) + 1;

          // Determine power type
          const powerType = this._detectPowerType(device);
          summary.byPowerType[powerType] = (summary.byPowerType[powerType] || 0) + 1;

          // Health status from monitor
          const deviceId = device.getData()?.id;
          if (deviceId && this.healthMonitor) {
            const status = this.healthMonitor.getDeviceStatus(deviceId);
            summary[status] = (summary[status] || 0) + 1;

            if (status === 'healthy' || status === 'stale') {
              summary.online++;
            } else {
              summary.offline++;
            }
          } else {
            // Fallback: check if device is available
            const isAvailable = device.getAvailable !== undefined ? device.getAvailable() : true;
            if (isAvailable) {
              summary.healthy++;
              summary.online++;
            } else {
              summary.dead++;
              summary.offline++;
            }
          }
        }
      }
    } catch (err) {
      this.error('Error getting device summary:', err.message);
    }

    return summary;
  }

  /**
   * Calculate overall network health score (0-100)
   * @private
   */
  async _calculateNetworkHealth() {
    const summary = await this._getDeviceSummary();

    if (summary.total === 0) {
      return { score: 100, grade: 'N/A', factors: {} };
    }

    // Connectivity score (healthy / total)
    const connectivityScore = (summary.healthy / summary.total) * 100;

    // Battery score (based on battery warnings)
    const batteryWarnings = await this._getBatteryWarnings();
    const batteryScore = batteryWarnings.length === 0
      ? 100
      : Math.max(0, 100 - (batteryWarnings.length * 10));

    // Freshness score (based on stale/silent devices)
    const stalePenalty = (summary.stale * 5) + (summary.silent * 15);
    const freshnessScore = Math.max(0, 100 - stalePenalty);

    // Reliability score (based on dead devices)
    const deadPenalty = summary.dead * 20;
    const reliabilityScore = Math.max(0, 100 - deadPenalty);

    // Weighted average
    const score = Math.round(
      (connectivityScore * this.SCORE_WEIGHTS.connectivity) +
      (batteryScore * this.SCORE_WEIGHTS.battery) +
      (freshnessScore * this.SCORE_WEIGHTS.freshness) +
      (reliabilityScore * this.SCORE_WEIGHTS.reliability)
    );

    // Determine grade
    let grade;
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    return {
      score,
      grade,
      factors: {
        connectivity: Math.round(connectivityScore),
        battery: Math.round(batteryScore),
        freshness: Math.round(freshnessScore),
        reliability: Math.round(reliabilityScore)
      }
    };
  }

  /**
   * Get devices with low battery warnings
   * @private
   */
  async _getBatteryWarnings() {
    const warnings = [];

    try {
      const drivers = Object.values(this.homey.drivers.getDrivers());

      for (const driver of drivers) {
        const devices = driver.getDevices() || [];
        for (const device of devices) {
          const batteryLevel = await this._getBatteryLevel(device);
          if (batteryLevel !== null) {
            if (batteryLevel <= this.BATTERY_CRITICAL_THRESHOLD) {
              warnings.push({
                deviceId: device.getData()?.id,
                deviceName: device.getName(),
                level: batteryLevel,
                severity: 'critical',
                message: `Battery critically low (${batteryLevel}%)`
              });
            } else if (batteryLevel <= this.BATTERY_LOW_THRESHOLD) {
              warnings.push({
                deviceId: device.getData()?.id,
                deviceName: device.getName(),
                level: batteryLevel,
                severity: 'low',
                message: `Battery low (${batteryLevel}%)`
              });
            }
          }
        }
      }
    } catch (err) {
      this.error('Error getting battery warnings:', err.message);
    }

    return warnings.sort((a, b) => a.level - b.level);
  }

  /**
   * Get devices with connectivity issues
   * @private
   */
  async _getConnectivityIssues() {
    const issues = [];

    if (!this.healthMonitor) return issues;

    try {
      const staleDevices = this.healthMonitor.getStaleDevices();

      for (const device of staleDevices) {
        const metadata = this.healthMonitor.deviceMetadata.get(device.deviceId);
        let issueType;
        let message;

        switch (device.status) {
          case 'stale':
            issueType = 'intermittent';
            message = `Device hasn't checked in for ${this._formatDuration(device.timeSinceLastSeen)}`;
            break;
          case 'silent':
            issueType = 'silent';
            message = `Device is silent (last seen ${this._formatDuration(device.timeSinceLastSeen)} ago)`;
            break;
          default:
            issueType = 'unknown';
            message = 'Unknown connectivity issue';
        }

        issues.push({
          deviceId: device.deviceId,
          modelId: device.modelId,
          manufacturerName: device.manufacturerName,
          status: device.status,
          issueType,
          message,
          timeSinceLastSeen: device.timeSinceLastSeen,
          consecutiveFailures: device.consecutiveFailures
        });
      }
    } catch (err) {
      this.error('Error getting connectivity issues:', err.message);
    }

    return issues.sort((a, b) => b.timeSinceLastSeen - a.timeSinceLastSeen);
  }

  /**
   * Get top performing devices (most active)
   * @private
   */
  async _getTopDevices() {
    if (!this.healthMonitor) return [];

    const topTalkers = this.healthMonitor.getTopTalkers(5);
    return topTalkers.map(d => ({
      deviceId: d.deviceId,
      modelId: d.modelId,
      timeSinceLastSeen: d.timeSinceLastSeen,
      status: d.status
    }));
  }

  /**
   * Get actionable recommendations
   * @private
   */
  async _getRecommendations() {
    const recommendations = [];
    const summary = await this._getDeviceSummary();
    const batteryWarnings = await this._getBatteryWarnings();

    // Battery recommendations
    const criticalBatteries = batteryWarnings.filter(w => w.severity === 'critical');
    if (criticalBatteries.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'battery',
        title: 'Critical Battery Levels',
        message: `${criticalBatteries.length} device(s) have critically low batteries. Replace batteries immediately.`,
        deviceIds: criticalBatteries.map(w => w.deviceId)
      });
    }

    const lowBatteries = batteryWarnings.filter(w => w.severity === 'low');
    if (lowBatteries.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'battery',
        title: 'Low Battery Warning',
        message: `${lowBatteries.length} device(s) have low batteries. Plan to replace soon.`,
        deviceIds: lowBatteries.map(w => w.deviceId)
      });
    }

    // Connectivity recommendations
    if (summary.dead > 0) {
      recommendations.push({
        priority: 'high',
        category: 'connectivity',
        title: 'Dead Devices Detected',
        message: `${summary.dead} device(s) are unresponsive. Consider re-pairing or checking power.`,
        action: 're-pair devices or check physical connections'
      });
    }

    if (summary.silent > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'connectivity',
        title: 'Silent Devices',
        message: `${summary.silent} device(s) haven't reported recently. Check mesh connectivity.`,
        action: 'verify Zigbee mesh or move devices closer to router'
      });
    }

    // Network recommendations
    if (summary.total > 20 && summary.online / summary.total < 0.9) {
      recommendations.push({
        priority: 'medium',
        category: 'network',
        title: 'Network Health Warning',
        message: 'More than 10% of devices are offline. Network may need attention.',
        action: 'consider adding Zigbee routers or repositioning devices'
      });
    }

    return recommendations;
  }

  /**
   * Get battery level from device
   * @private
   */
  async _getBatteryLevel(device) {
    try {
      if (device.getCapabilityValue) {
        const level = await device.getCapabilityValue('measure_battery');
        return typeof level === 'number' ? level : null;
      }
    } catch (err) {
      // Device doesn't have battery capability
    }
    return null;
  }

  /**
   * Detect device protocol
   * @private
   */
  _detectProtocol(device) {
    const settings = device.getSettings?.() || {};
    if (settings.ip_address || settings.local_key) return 'wifi';
    return 'zigbee';
  }

  /**
   * Detect device power type
   * @private
   */
  _detectPowerType(device) {
    const capabilities = device.getCapabilities?.() || [];
    if (capabilities.includes('measure_battery')) return 'battery';
    return 'mains';
  }

  /**
   * Format duration for display
   * @private
   */
  _formatDuration(ms) {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    if (ms < 86400000) return `${Math.round(ms / 3600000)}h`;
    return `${Math.round(ms / 86400000)}d`;
  }

  log(...args) {
    if (this.homey?.log) {
      this.homey.log('[HEALTH-DASH]', ...args);
    }
  }

  error(...args) {
    if (this.homey?.error) {
      this.homey.error('[HEALTH-DASH]', ...args);
    }
  }

  destroy() {
    this._cache = null;
    this.removeAllListeners();
  }
}

module.exports = DeviceHealthDashboard;
