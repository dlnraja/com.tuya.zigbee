'use strict';

/**
 * DeviceDiagnostics - Comprehensive diagnostic tool for Tuya/Zigbee devices
 * v5.2.9 - Based on user feedback and diagnostic reports
 *
 * Detects and reports:
 * - USB/Zigbee communication issues
 * - Battery reporting problems
 * - Driver assignment issues
 * - Data flow problems
 * - KPI collection status
 */

const RetryWithBackoff = require('../utils/RetryWithBackoff');

class DeviceDiagnostics {

  constructor(device) {
    this.device = device;
    this.diagnosticResults = {};
    this.retry = RetryWithBackoff.forDevice(device);
  }

  /**
   * Run full diagnostics on the device
   * @returns {Object} Diagnostic results
   */
  async runFullDiagnostics() {
    this.device.log('[DIAG] 🔍 Starting full device diagnostics...');
    const startTime = Date.now();

    try {
      // 1. Basic device info
      this.diagnosticResults.deviceInfo = this.getDeviceInfo();

      // 2. Capability status
      this.diagnosticResults.capabilities = await this.checkCapabilities();

      // 3. Cluster availability
      this.diagnosticResults.clusters = await this.checkClusters();

      // 4. Battery status
      this.diagnosticResults.battery = await this.checkBatteryStatus();

      // 5. Communication test
      this.diagnosticResults.communication = await this.testCommunication();

      // 6. Data flow status
      this.diagnosticResults.dataFlow = await this.checkDataFlow();

      // 7. Driver assignment
      this.diagnosticResults.driverAssignment = this.checkDriverAssignment();

      // Calculate overall health score
      this.diagnosticResults.healthScore = this.calculateHealthScore();
      this.diagnosticResults.duration = Date.now() - startTime;
      this.diagnosticResults.timestamp = new Date().toISOString();

      // Log summary
      this.logDiagnosticSummary();

      return this.diagnosticResults;

    } catch (err) {
      this.device.error('[DIAG] ❌ Diagnostics failed:', err.message);
      return {
        error: err.message,
        partial: this.diagnosticResults
      };
    }
  }

  /**
   * Get basic device info
   */
  getDeviceInfo() {
    const data = this.device.getData ? this.device.getData() : {};
    const settings = this.device.getSettings ? this.device.getSettings() : {};

    return {
      name: this.device.getName ? this.device.getName() : 'Unknown',
      id: data.id || data.ieee || 'Unknown',
      modelId: data.modelId || data.productId || settings.zb_product_id || 'Unknown',
      manufacturer: data.manufacturerName || settings.zb_manufacturer_name || 'Unknown',
      driverId: this.device.driver?.manifest?.id || 'Unknown',
      class: this.device.getClass ? this.device.getClass() : 'Unknown',
      available: this.device.getAvailable ? this.device.getAvailable() : false,
      isTuyaTS0601: this.isTuyaTS0601()
    };
  }

  /**
   * Check if device is Tuya TS0601
   */
  isTuyaTS0601() {
    const data = this.device.getData ? this.device.getData() : {};
    const modelId = (data.modelId || data.productId || '').toUpperCase();
    const manufacturer = data.manufacturerName || '';

    return modelId === 'TS0601' ||
      manufacturer.startsWith('_TZE200_') ||
      manufacturer.startsWith('_TZE204_') ||
      manufacturer.startsWith('_TZE284_');
  }

  /**
   * Check capabilities and their values
   */
  async checkCapabilities() {
    const capabilities = this.device.getCapabilities ? this.device.getCapabilities() : [];
    const result = {
      total: capabilities.length,
      withValues: 0,
      withoutValues: 0,
      details: {}
    };

    for (const cap of capabilities) {
      try {
        const value = this.device.getCapabilityValue ?
          await this.device.getCapabilityValue(cap) : undefined;

        result.details[cap] = {
          value: value,
          hasValue: value !== null && value !== undefined
        };

        if (value !== null && value !== undefined) {
          result.withValues++;
        } else {
          result.withoutValues++;
        }
      } catch (err) {
        result.details[cap] = { error: err.message };
        result.withoutValues++;
      }
    }

    return result;
  }

  /**
   * Check available clusters
   */
  async checkClusters() {
    const result = {
      available: [],
      tuyaClusterFound: false,
      endpoint1Available: false
    };

    try {
      const zclNode = this.device.zclNode;
      if (!zclNode) {
        result.error = 'zclNode not available';
        return result;
      }

      const endpoint = zclNode.endpoints?.[1];
      if (!endpoint) {
        result.error = 'Endpoint 1 not available';
        return result;
      }

      result.endpoint1Available = true;

      // List all clusters
      if (endpoint.clusters) {
        result.available = Object.keys(endpoint.clusters);

        // Check for Tuya cluster
        const tuyaClusterNames = ['tuya', 'tuyaManufacturer', 'tuyaSpecific',
          'manuSpecificTuya', '61184', '0xEF00'];

        for (const name of tuyaClusterNames) {
          if (endpoint.clusters[name]) {
            result.tuyaClusterFound = true;
            result.tuyaClusterName = name;
            break;
          }
        }
      }

    } catch (err) {
      result.error = err.message;
    }

    return result;
  }

  /**
   * Check battery status
   */
  async checkBatteryStatus() {
    const result = {
      hasBatteryCapability: false,
      batteryValue: null,
      lastBatteryUpdate: null,
      batteryManager: null,
      source: 'unknown'
    };

    try {
      // Check capability
      result.hasBatteryCapability = this.device.hasCapability ?
        this.device.hasCapability('measure_battery') : false;

      if (result.hasBatteryCapability) {
        result.batteryValue = await this.device.getCapabilityValue('measure_battery');
      }

      // Check for battery manager
      if (this.device.batteryManagerV4) {
        result.batteryManager = 'BatteryManagerV4';
        result.source = 'v4_manager';
      } else if (this.device.batteryManager) {
        result.batteryManager = 'BatteryManager';
        result.source = 'standard';
      }

      // Check store for last update
      if (this.device.getStoreValue) {
        result.lastBatteryUpdate = await this.device.getStoreValue('last_battery_update');
      }

      // For TS0601, check expected DP
      if (this.isTuyaTS0601()) {
        result.expectedSource = 'Tuya DP (4, 14, or 15)';
        result.note = 'Battery updates via passive DP reports from device';
      }

    } catch (err) {
      result.error = err.message;
    }

    return result;
  }

  /**
   * Test communication with device
   */
  async testCommunication() {
    const result = {
      canCommunicate: false,
      responseTime: null,
      method: null,
      errors: []
    };

    const startTime = Date.now();

    try {
      const zclNode = this.device.zclNode;
      if (!zclNode) {
        result.errors.push('No zclNode available');
        return result;
      }

      const endpoint = zclNode.endpoints?.[1];
      if (!endpoint) {
        result.errors.push('No endpoint 1');
        return result;
      }

      // Try genBasic cluster first (most reliable)
      if (endpoint.clusters?.genBasic) {
        try {
          const attrs = await this.retry.withTimeout(
            endpoint.clusters.genBasic.readAttributes(['modelId']),
            5000
          );
          if (attrs && attrs.modelId) {
            result.canCommunicate = true;
            result.method = 'genBasic.readAttributes';
            result.responseTime = Date.now() - startTime;
            result.response = { modelId: attrs.modelId };
            return result;
          }
        } catch (err) {
          result.errors.push(`genBasic failed: ${err.message}`);
        }
      }

      // For battery devices, communication may fail if sleeping
      if (this.device.hasCapability && this.device.hasCapability('measure_battery')) {
        result.note = 'Battery device may be sleeping - passive mode expected';
        result.canCommunicate = 'passive'; // Mark as passive mode
        return result;
      }

    } catch (err) {
      result.errors.push(err.message);
    }

    return result;
  }

  /**
   * Check data flow status
   */
  async checkDataFlow() {
    const result = {
      hasRecentData: false,
      lastDataReceived: null,
      dataPoints: {},
      listeners: {
        tuyaDP: false,
        attributeReport: false,
        zclEvent: false
      }
    };

    try {
      // Check for last data store value
      if (this.device.getStoreValue) {
        result.lastDataReceived = await this.device.getStoreValue('last_data_received');

        // Check for DP data
        for (let dp = 1; dp <= 20; dp++) {
          const dpValue = await this.device.getStoreValue(`dp_${dp}_value`);
          if (dpValue !== null && dpValue !== undefined) {
            result.dataPoints[`DP${dp}`] = dpValue;
          }
        }
      }

      // Check if device has registered listeners
      if (this.device.tuyaEF00Manager) {
        result.listeners.tuyaDP = true;
        if (this.device.tuyaEF00Manager.passiveMode) {
          result.listeners.mode = 'passive';
        }
      }

      // Check for recent data (within last hour)
      if (result.lastDataReceived) {
        const age = Date.now() - result.lastDataReceived;
        result.hasRecentData = age < 3600000; // 1 hour
        result.dataAge = Math.floor(age / 60000) + ' minutes';
      }

    } catch (err) {
      result.error = err.message;
    }

    return result;
  }

  /**
   * Check driver assignment
   */
  checkDriverAssignment() {
    const result = {
      currentDriver: null,
      recommendedDriver: null,
      isCorrect: null,
      confidence: 0
    };

    try {
      result.currentDriver = this.device.driver?.manifest?.id || 'Unknown';

      // Get device info
      const data = this.device.getData ? this.device.getData() : {};
      const manufacturer = data.manufacturerName || '';
      const modelId = data.modelId || data.productId || '';

      // Known mappings for problematic devices
      const KNOWN_MAPPINGS = {
        '_TZE200_rhgsbacq': 'presence_sensor_radar',
        '_TZE200_3towulqd': 'zg_204zv_multi_sensor',
        '_TZE200_9yapgbuv': 'climate_sensor_temp_humidity_advanced',
        '_TZE204_mvtclclq': 'usb_outlet_bseed',
        '_TZE284_vvmbj46n': 'soil_sensor'
      };

      // Check if we have a recommended driver
      for (const [mfr, driver] of Object.entries(KNOWN_MAPPINGS)) {
        if (manufacturer.startsWith(mfr)) {
          result.recommendedDriver = driver;
          result.confidence = 95;
          result.isCorrect = result.currentDriver === driver;
          break;
        }
      }

      if (!result.recommendedDriver) {
        result.note = 'No specific mapping - using current driver';
        result.isCorrect = true;
        result.confidence = 50;
      }

    } catch (err) {
      result.error = err.message;
    }

    return result;
  }

  /**
   * Calculate overall health score (0-100)
   */
  calculateHealthScore() {
    let score = 100;
    const issues = [];

    // Device availability
    if (!this.diagnosticResults.deviceInfo?.available) {
      score -= 30;
      issues.push('Device unavailable');
    }

    // Capabilities without values
    const caps = this.diagnosticResults.capabilities;
    if (caps) {
      const missingRatio = caps.withoutValues / caps.total;
      if (missingRatio > 0.5) {
        score -= 20;
        issues.push('Many capabilities without values');
      } else if (missingRatio > 0.2) {
        score -= 10;
        issues.push('Some capabilities without values');
      }
    }

    // Cluster availability
    if (this.diagnosticResults.deviceInfo?.isTuyaTS0601 &&
      !this.diagnosticResults.clusters?.tuyaClusterFound) {
      score -= 15;
      issues.push('Tuya cluster not found (using passive mode)');
    }

    // Communication
    const comm = this.diagnosticResults.communication;
    if (comm && !comm.canCommunicate && comm.canCommunicate !== 'passive') {
      score -= 20;
      issues.push('Communication failed');
    }

    // Battery
    const battery = this.diagnosticResults.battery;
    if (battery?.hasBatteryCapability && battery.batteryValue === null) {
      score -= 10;
      issues.push('Battery value not available');
    }

    // Driver assignment
    if (this.diagnosticResults.driverAssignment?.isCorrect === false) {
      score -= 15;
      issues.push('Driver may be incorrect');
    }

    return {
      score: Math.max(0, score),
      issues: issues,
      status: score >= 80 ? 'healthy' : score >= 50 ? 'degraded' : 'critical'
    };
  }

  /**
   * Log diagnostic summary
   */
  logDiagnosticSummary() {
    const info = this.diagnosticResults.deviceInfo || {};
    const health = this.diagnosticResults.healthScore || {};

    this.device.log('══════════════════════════════════════════════════════════════');
    this.device.log(`📊 DIAGNOSTIC REPORT: ${info.name}`);
    this.device.log('══════════════════════════════════════════════════════════════');
    this.device.log(`   Model: ${info.modelId} (${info.manufacturer})`);
    this.device.log(`   Driver: ${info.driverId}`);
    this.device.log(`   Available: ${info.available ? 'Yes ✅' : 'No ❌'}`);
    this.device.log(`   Tuya TS0601: ${info.isTuyaTS0601 ? 'Yes' : 'No'}`);
    this.device.log('──────────────────────────────────────────────────────────────');
    this.device.log(`   Health Score: ${health.score}/100 (${health.status})`);

    if (health.issues?.length > 0) {
      this.device.log(`   Issues: ${health.issues.join(', ')}`);
    }

    this.device.log('══════════════════════════════════════════════════════════════');
  }

  /**
   * Get recommendations based on diagnostics
   */
  getRecommendations() {
    const recommendations = [];
    const health = this.diagnosticResults.healthScore || {};

    if (health.issues?.includes('Device unavailable')) {
      recommendations.push({
        priority: 'high',
        action: 'Check device power and Zigbee range',
        details: 'Device is not responding. Verify it is powered on and within range of a router.'
      });
    }

    if (health.issues?.includes('Tuya cluster not found')) {
      recommendations.push({
        priority: 'medium',
        action: 'Device is in passive mode',
        details: 'The Tuya DP cluster is not directly accessible. Device will report data when it wakes up.'
      });
    }

    if (health.issues?.includes('Battery value not available')) {
      recommendations.push({
        priority: 'low',
        action: 'Wait for battery report',
        details: 'Battery-powered devices report battery level every 4-24 hours. Wait for the device to wake up.'
      });
    }

    if (this.diagnosticResults.driverAssignment?.isCorrect === false) {
      recommendations.push({
        priority: 'high',
        action: 'Re-pair device with correct driver',
        details: `Current: ${this.diagnosticResults.driverAssignment.currentDriver}, Recommended: ${this.diagnosticResults.driverAssignment.recommendedDriver}`
      });
    }

    return recommendations;
  }
}

module.exports = DeviceDiagnostics;
