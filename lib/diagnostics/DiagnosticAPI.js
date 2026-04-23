'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');


const { CLUSTERS } = require('../constants/ZigbeeConstants.js');


/**
 *  DIAGNOSTIC API
 * Expose logs and diagnostics for external access (MCP, AI agents, debugging)
 * Allows intelligent monitoring and auto-correction by AI agents
 */

const Homey = require('homey');

class DiagnosticAPI {
  constructor(app) {
    this.app = app;
    this.maxLogEntries = 5000;
    this.logs = [];
    this.errors = new Map();
    this.devices = new Map();
    this.startTime = Date.now();
    
    this.app.log('[DIAG-API]  Diagnostic API initialized');
  }

  /**
   * Add a log entry
   */
  addLog(level, category, message, device = null, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level, // INFO, WARN, ERROR, DEBUG
      category, // ZIGBEE, CLUSTER, DEVICE, FLOW, etc.
      message,
      device,
      meta
    };

    this.logs.push(entry);

    // Maintain circular buffer
    if (this.logs.length > this.maxLogEntries) {
      this.logs.shift();
    }

    // Track errors
    if (level === 'ERROR') {
      const errorKey = `${category}_${message.substring(0, 50)}`;
      if (!this.errors.has(errorKey)) {
        this.errors.set(errorKey, {
          category,
          message,
          count: 1,
          firstSeen: entry.timestamp,
          lastSeen: entry.timestamp,
          devices: device ? [device] : []
        });
      } else {
        const error = this.errors.get(errorKey);
        error.count++;
        error.lastSeen = entry.timestamp;
        if (device && !error.devices.includes(device)) {
          error.devices.push(device);
        }
      }
    }

    // Track device events
    if (device) {
      if (!this.devices.has(device)) {
        this.devices.set(device, {
          name: device,
          events: [],
          errors: 0,
          warnings: 0,
          firstSeen: entry.timestamp
        });
      }

      const deviceData = this.devices.get(device);
      deviceData.events.push({
        timestamp: entry.timestamp,
        level,
        category,
        message
      });

      if (level === 'ERROR') deviceData.errors++;
      if (level === 'WARN') deviceData.warnings++;

      // Keep last 500 events per device
      if (deviceData.events.length > 500) {
        deviceData.events.shift();
      }
    }

    return entry;
  }

  /**
   * Get all logs (optionally filtered)
   */
  getLogs(filter = {}) {
    let filteredLogs = [...this.logs];

    if (filter.level) {
      filteredLogs = filteredLogs.filter(l => l.level === filter.level);
    }

    if (filter.category) {
      filteredLogs = filteredLogs.filter(l => l.category === filter.category);
    }

    if (filter.device) {
      filteredLogs = filteredLogs.filter(l => l.device === filter.device);
    }

    if (filter.since) {
      const since = new Date(filter.since);
      filteredLogs = filteredLogs.filter(l => new Date(l.timestamp) >= since);
    }

    if (filter.limit) {
      filteredLogs = filteredLogs.slice(-filter.limit);
    }

    return filteredLogs;
  }

  /**
   * Get error summary
   */
  getErrors() {
    return Array.from(this.errors.entries()).map(([key, error]) => ({
      id: key,
      ...error
    })).sort((a, b) => b.count - a.count);
  }

  /**
   * Get device diagnostics
   */
  getDevices() {
    return Array.from(this.devices.entries()).map(([key, device]) => ({
      ...device,
      eventCount: device.events.length,
      healthScore: this.calculateHealthScore(device)
    }));
  }

  /**
   * Calculate device health score (0-100)
   */
  calculateHealthScore(device) {
    const totalEvents = device.events.length;
    if (totalEvents === 0) return 100;

    const errorRatio = safeDivide(device.errors, totalEvents);
    const warningRatio = safeDivide(device.warnings, totalEvents);

    const score = Math.max(0, 100 - (errorRatio * 50) - (warningRatio * 20));
    return Math.round(score);
  }

  /**
   * Get full diagnostic report (MCP-ready format)
   */
  getFullReport(includeDeviceDetails = false) {
    const uptime = Date.now() - this.startTime;
    const errors = this.getErrors();

    const report = {
      generated: new Date().toISOString(),
      uptime: Math.round(safeParse(uptime)),
      summary: {
        totalLogs: this.logs.length,
        totalErrors: errors.length,
        totalDevices: this.devices.size,
        criticalErrors: errors.filter(e => e.count >= 10).length,
        recentErrors: errors.filter(e => {
          const lastSeen = new Date(e.lastSeen);
          return (Date.now() - lastSeen.getTime()) < 300000; // Last 5 minutes
        }).length
      },
      allErrors: errors,
      devices: this.getDevices(),
      recommendations: this.generateRecommendations()
    };

    if (includeDeviceDetails) {
      report.deviceDetails = Array.from(this.devices.entries()).map(([key, device]) => ({
        name: key,
        ...device
      }));
    }

    return report;
  }

  /**
   * Generate AI-ready recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const errors = this.getErrors();

    // Analyze error patterns
    for (const error of errors.slice(0, 5)) {
      let recommendation = {
        priority: error.count >= 10 ? 'CRITICAL' : error.count >= 5 ? 'HIGH' : 'MEDIUM',
        category: error.category,
        issue: error.message,
        occurrences: error.count,
        affectedDevices: error.devices.length,
        suggestedFix: this.suggestFix(error)
      };

      recommendations.push(recommendation);
    }

    // Analyze device health
    const unhealthyDevices = this.getDevices().filter(d => d.healthScore < 50);
    if (unhealthyDevices.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'DEVICE_HEALTH',
        issue: `${unhealthyDevices.length} devices with poor health score`,
        occurrences: unhealthyDevices.length,
        affectedDevices: unhealthyDevices.length,
        suggestedFix: 'Review device logs and check Zigbee connectivity'
      });
    }

    return recommendations;
  }

  /**
   * Suggest fix based on error pattern
   */
  suggestFix(error) {
    const patterns = [
      {
        pattern: /expected_cluster_id_number/i,
        fix: 'Use CLUSTER.* constants instead of string literals in registerCapability calls'
      },
      {
        pattern: /Does not exist cluster/i,
        fix: 'Check cluster presence before configureReporting, or remove reporting for this cluster'
      },
      {
        pattern: /Zigbee est en cours de dÃ©marrage/i,
        fix: 'Add initialization delay (2-3s) before Zigbee operations'
      },
      {
        pattern: /Could not read battery/i,
        fix: 'Add retry logic for battery reads or check powerConfiguration cluster availability'
      },
      {
        pattern: /reporting failed/i,
        fix: 'Verify attribute exists before configuring reporting'
      },
      {
        pattern: /MODULE_NOT_FOUND/i,
        fix: 'Add graceful fallback for missing module dependencies'
      }
    ];

    for (const { pattern, fix } of patterns) {
      if (pattern.test(error.message)) {
        return fix;
      }
    }

    return 'Review error context and check Homey documentation';
  }

  /**
   * Clear old logs (keep last N hours)
   */
  clearOldLogs(hoursToKeep = 24) {
    const cutoff = (Date.now() - (hoursToKeep * 60 * 60 * 1000));
    const cutoffISO = new Date(cutoff).toISOString();

    this.logs = this.logs.filter(l => l.timestamp >= cutoffISO);

    this.app.log(`[DIAG-API]  Cleared logs older than ${hoursToKeep}h`);
  }

  /**
   * Reset all diagnostics
   */
  reset() {
    this.logs = [];
    this.errors.clear();
    this.devices.clear();
    this.startTime = Date.now();
    this.app.log('[DIAG-API]  Diagnostics reset');
  }

  /**
   * Export diagnostics for external analysis
   */
  exportForAI() {
    return {
      version: '2.0.0',
      exported: new Date().toISOString(),
      app: {
        id: this.app.manifest.id,
        version: this.app.manifest.version,
        uptime: Math.round((Date.now() - this.startTime) / 1000)
      },
      diagnostics: this.getFullReport(true),
      allLogs: this.logs,
      aiHints: {
        errorPatterns: this.getErrors().map(e => ({
          pattern: e.message,
          frequency: e.count,
          category: e.category,
          firstSeen: e.firstSeen,
          lastSeen: e.lastSeen,
          affectedDevices: e.devices
        })),
        deviceIssues: this.getDevices().map(d => ({
          device: d.name,
          healthScore: d.healthScore,
          errorCount: d.errors,
          warningCount: d.warnings,
          eventCount: d.eventCount,
          recentEvents: d.events ? d.events.slice(-50) : []
        }))
      },
      architectureReference: {
        baseClasses: {
          BaseUnifiedDevice: 'Ultimate base - handles both Tuya DP (CLUSTERS.TUYA_EF00) and ZCL protocols with auto-detection',
          UnifiedSwitchBase: 'Multi-gang switches with physical button detection and power-on/backlight settings',
          UnifiedSensorBase: 'All sensors - motion, contact, temp/humidity, air quality, soil, rain, smoke',
          UnifiedPlugBase: 'Smart plugs, water valves, energy monitoring with metering clusters',
          UnifiedCoverBase: 'Curtain motors, blinds, shutters with position/tilt control',
          UnifiedLightBase: 'Bulbs, LED strips, dimmers with color temp and RGB support',
          UnifiedThermostatBase: 'TRVs, thermostats with schedule and temperature control',
          ButtonDevice: 'Wireless buttons, scene switches with multi-press detection'
        },
        protocols: {
          TUYA_DP: 'Cluster CLUSTERS.TUYA_EF00 (CLUSTERS.TUYA_EF00) - DP types: 0=Raw, 1=Bool, 2=Value(4byte), 3=String, 4=Enum, 5=Bitmap',
          ZCL: 'Standard Zigbee Cluster Library - onOff, levelControl, colorControl, etc.',
          HYBRID: 'Auto-detected per device based on manufacturerName/modelId patterns'
        },
        keyManagers: {
          TuyaEF00Manager: 'Handles DP report parsing, AdaptiveDataParser for auto-type/divisor, dpMappings for capability mapping',
          DeviceProfileRegistry: 'Per-fingerprint config: DP mappings, cluster configs, quirks, timing'
        },
        settingsKeys: { modelId: 'zb_model_id', manufacturerName: 'zb_manufacturer_name' },
        commonDPs: {
          switches: 'DP1-8=gang states, DP14=power-on, DP15=backlight, DP101=child_lock',
          sensors: 'DP1-4=primary measurements, DP14=battery_state, DP15=battery_pct',
          covers: 'DP1=control(open/stop/close), DP2=position(0-100), DP3=direction, DP7=work_state',
          thermostats: 'DP1=on/off, DP2=target_temp, DP3=current_temp, DP4=mode'
        },
        knownBugs: {
          doubleDivision: 'EF00Manager auto-converts via AdaptiveDataParser THEN dpMappings divisor divides again',
          falseBattery: 'Mains devices with mainsPowered=true must NOT have measure_battery',
          unknownDevice: 'Check settings keys zb_model_id and zb_manufacturer_name (NOT camelCase)',
          physicalButtonMiss: 'appCommandPending timeout must be 2000ms',
          duplicateFlowTriggers: 'Need deduplication with 500ms window per capability+value'
        }
      }
    };
  }
}

module.exports = DiagnosticAPI;
