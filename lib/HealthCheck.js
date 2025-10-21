'use strict';

/**
 * HEALTH CHECK SYSTEM
 * 
 * Vérifie la santé du device et du réseau Zigbee
 * Fournit diagnostic détaillé en cas de problème
 * 
 * Basé sur best practices IKEA TRÅDFRI et Xiaomi Mi Home
 */

class HealthCheck {
  constructor(device) {
    this.device = device;
    this.history = [];
    this.maxHistorySize = 50;
  }

  /**
   * Perform complete health check
   * 
   * @returns {Object} Health report
   */
  async check() {
    const report = {
      timestamp: new Date().toISOString(),
      overall: 'unknown',
      scores: {
        connectivity: 0,
        power: 0,
        functionality: 0,
        network: 0
      },
      details: {},
      issues: [],
      recommendations: []
    };

    try {
      // 1. Connectivity checks
      report.details.connectivity = await this.checkConnectivity();
      report.scores.connectivity = this.scoreConnectivity(report.details.connectivity);

      // 2. Power checks
      report.details.power = await this.checkPower();
      report.scores.power = this.scorePower(report.details.power);

      // 3. Functionality checks
      report.details.functionality = await this.checkFunctionality();
      report.scores.functionality = this.scoreFunctionality(report.details.functionality);

      // 4. Network quality checks
      report.details.network = await this.checkNetwork();
      report.scores.network = this.scoreNetwork(report.details.network);

      // Calculate overall score
      const avgScore = Object.values(report.scores).reduce((a, b) => a + b, 0) / 4;
      report.overall = this.getOverallStatus(avgScore);

      // Generate issues and recommendations
      this.analyzeReport(report);

      // Store in history
      this.addToHistory(report);

    } catch (err) {
      this.device.error('Health check failed:', err);
      report.overall = 'error';
      report.issues.push({
        severity: 'critical',
        message: `Health check failed: ${err.message}`,
        category: 'system'
      });
    }

    return report;
  }

  /**
   * Check device connectivity
   */
  async checkConnectivity() {
    const result = {
      node_available: false,
      node_online: false,
      last_seen: null,
      last_seen_ago: null,
      endpoint_available: false,
      communication_working: false
    };

    try {
      // Node availability
      result.node_available = !!this.device.zclNode;
      
      if (result.node_available) {
        result.node_online = this.device.zclNode.available || false;
        result.last_seen = this.device.zclNode.lastSeen;
        
        if (result.last_seen) {
          result.last_seen_ago = Date.now() - result.last_seen;
        }

        // Endpoint check
        result.endpoint_available = !!this.device.zclNode.endpoints[1];

        // Try simple read to check communication
        if (result.endpoint_available) {
          try {
            await this.device.zclNode.endpoints[1].clusters.basic.readAttributes('manufacturerName');
            result.communication_working = true;
          } catch (err) {
            result.communication_working = false;
            result.communication_error = err.message;
          }
        }
      }
    } catch (err) {
      this.device.error('Connectivity check failed:', err);
    }

    return result;
  }

  /**
   * Check power status
   */
  async checkPower() {
    const result = {
      has_battery: false,
      battery_level: null,
      battery_healthy: false,
      battery_voltage: null,
      charging: null,
      power_source: 'unknown'
    };

    try {
      // Check if device has battery capability
      result.has_battery = this.device.hasCapability('measure_battery');

      if (result.has_battery) {
        result.battery_level = this.device.getCapabilityValue('measure_battery');
        result.battery_healthy = result.battery_level > 10;

        // Try to read battery voltage if available
        try {
          if (this.device.zclNode.endpoints[1].clusters.powerConfiguration) {
            const voltage = await this.device.zclNode.endpoints[1].clusters.powerConfiguration
              .readAttributes('batteryVoltage');
            result.battery_voltage = voltage.batteryVoltage / 10; // Decivolts to volts
          }
        } catch (err) {
          // Battery voltage not available
        }

        result.power_source = 'battery';
      } else {
        result.power_source = 'mains';
        result.battery_healthy = true; // AC powered is always "healthy"
      }
    } catch (err) {
      this.device.error('Power check failed:', err);
    }

    return result;
  }

  /**
   * Check device functionality
   */
  async checkFunctionality() {
    const result = {
      capabilities: [],
      capabilities_working: 0,
      capabilities_total: 0,
      last_update: null,
      responding: false
    };

    try {
      const capabilities = this.device.getCapabilities();
      result.capabilities_total = capabilities.length;

      for (const capability of capabilities) {
        const value = this.device.getCapabilityValue(capability);
        const capResult = {
          name: capability,
          value,
          has_value: value !== null && value !== undefined,
          last_updated: this.device.getCapabilityOptions(capability)?.lastUpdated
        };

        if (capResult.has_value) {
          result.capabilities_working++;
        }

        result.capabilities.push(capResult);
      }

      // Check if device is responding
      result.responding = result.capabilities_working > 0;

      // Get most recent update time
      const updateTimes = result.capabilities
        .map(c => c.last_updated)
        .filter(t => t)
        .sort((a, b) => b - a);
      
      if (updateTimes.length > 0) {
        result.last_update = updateTimes[0];
      }

    } catch (err) {
      this.device.error('Functionality check failed:', err);
    }

    return result;
  }

  /**
   * Check network quality
   */
  async checkNetwork() {
    const result = {
      lqi: null,
      rssi: null,
      neighbors: 0,
      signal_quality: 'unknown',
      network_stable: false
    };

    try {
      if (this.device.zclNode.endpoints[1]) {
        const endpoint = this.device.zclNode.endpoints[1];
        
        // LQI (Link Quality Indicator) - 0-255
        result.lqi = endpoint.LQI || null;
        
        // RSSI (Received Signal Strength Indicator) - dBm
        result.rssi = endpoint.RSSI || null;

        // Determine signal quality
        if (result.lqi !== null) {
          if (result.lqi > 200) result.signal_quality = 'excellent';
          else if (result.lqi > 150) result.signal_quality = 'good';
          else if (result.lqi > 100) result.signal_quality = 'fair';
          else result.signal_quality = 'poor';
        }

        // Network stability (based on recent history)
        const recentReports = this.history.slice(-5);
        if (recentReports.length >= 3) {
          const lqiValues = recentReports
            .map(r => r.details?.network?.lqi)
            .filter(v => v !== null);
          
          if (lqiValues.length >= 3) {
            const avgLqi = lqiValues.reduce((a, b) => a + b, 0) / lqiValues.length;
            const variance = lqiValues.reduce((sum, val) => sum + Math.pow(val - avgLqi, 2), 0) / lqiValues.length;
            
            // Stable if variance is low
            result.network_stable = variance < 500;
          }
        }
      }
    } catch (err) {
      this.device.error('Network check failed:', err);
    }

    return result;
  }

  /**
   * Score connectivity (0-100)
   */
  scoreConnectivity(data) {
    let score = 0;

    if (data.node_available) score += 25;
    if (data.node_online) score += 25;
    if (data.endpoint_available) score += 25;
    if (data.communication_working) score += 25;

    // Penalty for old last_seen
    if (data.last_seen_ago) {
      const hoursAgo = data.last_seen_ago / (1000 * 60 * 60);
      if (hoursAgo > 24) score -= 20;
      else if (hoursAgo > 12) score -= 10;
      else if (hoursAgo > 6) score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score power (0-100)
   */
  scorePower(data) {
    let score = 100;

    if (data.has_battery) {
      if (data.battery_level === null) {
        score = 50; // No data
      } else if (data.battery_level < 10) {
        score = 20; // Critical
      } else if (data.battery_level < 20) {
        score = 50; // Low
      } else if (data.battery_level < 50) {
        score = 75; // Medium
      } else {
        score = 100; // Good
      }
    }

    return score;
  }

  /**
   * Score functionality (0-100)
   */
  scoreFunctionality(data) {
    let score = 0;

    if (data.capabilities_total === 0) return 0;

    // Base score from working capabilities
    const percentage = (data.capabilities_working / data.capabilities_total) * 100;
    score = percentage;

    // Bonus if responding
    if (data.responding) score = Math.min(100, score + 10);

    // Penalty if no recent updates
    if (data.last_update) {
      const hoursAgo = (Date.now() - data.last_update) / (1000 * 60 * 60);
      if (hoursAgo > 24) score -= 20;
      else if (hoursAgo > 12) score -= 10;
    } else {
      score -= 30; // Never updated
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score network (0-100)
   */
  scoreNetwork(data) {
    let score = 50; // Default for unknown

    if (data.lqi !== null) {
      // LQI 0-255 → Score 0-100
      score = (data.lqi / 255) * 100;
    }

    // Bonus for stable network
    if (data.network_stable) {
      score = Math.min(100, score + 10);
    }

    return Math.round(score);
  }

  /**
   * Get overall status from average score
   */
  getOverallStatus(avgScore) {
    if (avgScore >= 80) return 'excellent';
    if (avgScore >= 60) return 'good';
    if (avgScore >= 40) return 'fair';
    if (avgScore >= 20) return 'poor';
    return 'critical';
  }

  /**
   * Analyze report and generate issues/recommendations
   */
  analyzeReport(report) {
    const { details, scores } = report;

    // Connectivity issues
    if (!details.connectivity.node_available) {
      report.issues.push({
        severity: 'critical',
        message: 'Device node not available',
        category: 'connectivity',
        solution: 'Try re-pairing the device or checking Zigbee network'
      });
    } else if (!details.connectivity.node_online) {
      report.issues.push({
        severity: 'high',
        message: 'Device is offline',
        category: 'connectivity',
        solution: 'Check if device is powered and within Zigbee range'
      });
    } else if (!details.connectivity.communication_working) {
      report.issues.push({
        severity: 'medium',
        message: 'Communication with device failing',
        category: 'connectivity',
        solution: 'Device may be too far from coordinator or experiencing interference'
      });
    }

    // Power issues
    if (details.power.has_battery) {
      if (details.power.battery_level < 10) {
        report.issues.push({
          severity: 'critical',
          message: `Battery critically low (${details.power.battery_level}%)`,
          category: 'power',
          solution: 'Replace battery immediately'
        });
      } else if (details.power.battery_level < 20) {
        report.issues.push({
          severity: 'medium',
          message: `Battery low (${details.power.battery_level}%)`,
          category: 'power',
          solution: 'Consider replacing battery soon'
        });
      }
    }

    // Functionality issues
    if (details.functionality.capabilities_working === 0) {
      report.issues.push({
        severity: 'high',
        message: 'No capabilities reporting values',
        category: 'functionality',
        solution: 'Device may need to be reset or re-paired'
      });
    } else if (details.functionality.capabilities_working < details.functionality.capabilities_total) {
      const missing = details.functionality.capabilities_total - details.functionality.capabilities_working;
      report.issues.push({
        severity: 'low',
        message: `${missing} capability(ies) not reporting`,
        category: 'functionality',
        solution: 'Some features may not be working correctly'
      });
    }

    // Network issues
    if (details.network.signal_quality === 'poor') {
      report.issues.push({
        severity: 'medium',
        message: `Poor signal quality (LQI: ${details.network.lqi})`,
        category: 'network',
        solution: 'Move device closer to coordinator or add Zigbee repeater'
      });
      
      report.recommendations.push({
        type: 'network',
        message: 'Consider adding a Zigbee repeater (AC-powered device) between this device and the coordinator'
      });
    }

    if (!details.network.network_stable) {
      report.recommendations.push({
        type: 'network',
        message: 'Network quality is fluctuating. Check for sources of interference (WiFi, microwaves, etc.)'
      });
    }

    // General recommendations
    if (scores.connectivity < 80 || scores.functionality < 80) {
      report.recommendations.push({
        type: 'general',
        message: 'If problems persist, try removing and re-pairing the device'
      });
    }
  }

  /**
   * Add report to history
   */
  addToHistory(report) {
    this.history.push(report);
    
    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Get health history
   */
  getHistory() {
    return this.history;
  }

  /**
   * Get health trend
   */
  getTrend() {
    if (this.history.length < 2) {
      return { trend: 'unknown', message: 'Not enough data' };
    }

    const recent = this.history.slice(-5);
    const scores = recent.map(r => {
      const avg = Object.values(r.scores).reduce((a, b) => a + b, 0) / 4;
      return avg;
    });

    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    const diff = lastScore - firstScore;

    if (diff > 10) {
      return { trend: 'improving', message: 'Device health is improving', change: `+${diff.toFixed(1)}%` };
    } else if (diff < -10) {
      return { trend: 'declining', message: 'Device health is declining', change: `${diff.toFixed(1)}%` };
    } else {
      return { trend: 'stable', message: 'Device health is stable', change: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` };
    }
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = [];
  }
}

module.exports = HealthCheck;
