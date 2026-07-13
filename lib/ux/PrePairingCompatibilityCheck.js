'use strict';

/**
 * Pre-Pairing Compatibility Check - UX #90
 *
 * Checks device compatibility before pairing:
 * - Firmware version compatibility
 * - Zigbee protocol version check
 * - Required cluster support check
 * - Network capacity check
 * - Known issue database lookup
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class PrePairingCompatibilityCheck extends EventEmitter {
  constructor(homey, options = {}) {
    super();
    this.homey = homey;

    // Known issues database (manufacturer/model -> known problems)
    this._knownIssues = new Map();

    // Compatibility rules
    this._compatibilityRules = new Map();

    // Initialize with common issues
    this._initKnownIssues();
  }

  /**
   * Run a full compatibility check before pairing
   * @param {Object} deviceInfo - { manufacturerName, productId, zigbeeVersion, firmwareVersion, endpoints }
   * @returns {Object} Compatibility report
   */
  async checkCompatibility(deviceInfo) {
    const report = {
      compatible: true,
      confidence: 100,
      checks: [],
      warnings: [],
      errors: [],
      recommendations: [],
      timestamp: Date.now()
    };

    // Check 1: Manufacturer/Model recognition
    const recognition = this._checkRecognition(deviceInfo);
    report.checks.push(recognition);

    // Check 2: Zigbee protocol version
    const protocolCheck = this._checkProtocolVersion(deviceInfo);
    report.checks.push(protocolCheck);

    // Check 3: Required clusters
    const clusterCheck = this._checkRequiredClusters(deviceInfo);
    report.checks.push(clusterCheck);

    // Check 4: Network capacity
    const networkCheck = await this._checkNetworkCapacity();
    report.checks.push(networkCheck);

    // Check 5: Known issues
    const issuesCheck = this._checkKnownIssues(deviceInfo);
    report.checks.push(issuesCheck);

    // Check 6: Firmware compatibility
    const firmwareCheck = this._checkFirmwareCompatibility(deviceInfo);
    report.checks.push(firmwareCheck);

    // Compile results
    for (const check of report.checks) {
      if (check.status === 'error') {
        report.compatible = false;
        report.errors.push(check.message);
        report.confidence -= 25;
      } else if (check.status === 'warning') {
        report.warnings.push(check.message);
        report.confidence -= 10;
      }
    }

    report.confidence = Math.max(0, Math.min(100, report.confidence));

    // Add recommendations
    if (report.warnings.length > 0) {
      report.recommendations.push('Proceed with caution - some features may not work correctly');
    }
    if (report.confidence < 70) {
      report.recommendations.push('Consider checking community forums for similar device experiences');
    }

    this.emit('checkComplete', report);
    return report;
  }

  /**
   * Register a known issue for a device
   * @param {string} manufacturerName
   * @param {string} productId
   * @param {Object} issue - { severity, description, workaround, firmwareFix }
   */
  registerKnownIssue(manufacturerName, productId, issue) {
    const key = `${manufacturerName}:${productId}`;
    if (!this._knownIssues.has(key)) {
      this._knownIssues.set(key, []);
    }
    this._knownIssues.get(key).push({
      ...issue,
      registeredAt: Date.now()
    });
  }

  /**
   * Add a compatibility rule
   * @param {string} ruleId
   * @param {Object} rule - { check: function, message, severity }
   */
  addRule(ruleId, rule) {
    this._compatibilityRules.set(ruleId, rule);
  }

  /**
   * Get compatibility summary for a device type
   * @param {string} manufacturerName
   */
  getCompatibilityInfo(manufacturerName) {
    const issues = [];
    for (const [key, issueList] of this._knownIssues.entries()) {
      if (key.startsWith(manufacturerName + ':')) {
        issues.push(...issueList);
      }
    }

    return {
      manufacturerName,
      knownIssueCount: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      issues
    };
  }

  // ─── Internal Checks ────────────────────────────────────────────────

  _checkRecognition(deviceInfo) {
    const { manufacturerName, productId } = deviceInfo;

    if (!manufacturerName || !productId) {
      return {
        name: 'device_recognition',
        status: 'warning',
        message: 'Device identification incomplete - manufacturer or product ID missing'
      };
    }

    // Check if it's a known Tuya manufacturer
    const tuyaPatterns = /^(_TZE|_TY|_TZ)/;
    if (tuyaPatterns.test(manufacturerName)) {
      return {
        name: 'device_recognition',
        status: 'pass',
        message: `Tuya device detected: ${manufacturerName} / ${productId}`
      };
    }

    return {
      name: 'device_recognition',
      status: 'warning',
      message: `Non-Tuya manufacturer detected: ${manufacturerName}. May have limited support.`
    };
  }

  _checkProtocolVersion(deviceInfo) {
    const version = deviceInfo.zigbeeVersion;
    if (!version) {
      return {
        name: 'protocol_version',
        status: 'info',
        message: 'Zigbee protocol version unknown'
      };
    }

    if (version >= 3.0) {
      return {
        name: 'protocol_version',
        status: 'pass',
        message: `Zigbee ${version} - Full feature support`
      };
    }

    if (version >= 2.0) {
      return {
        name: 'protocol_version',
        status: 'warning',
        message: `Zigbee ${version} - Some features may be limited`
      };
    }

    return {
      name: 'protocol_version',
      status: 'error',
      message: `Zigbee ${version} - Too old for reliable support`
    };
  }

  _checkRequiredClusters(deviceInfo) {
    const endpoints = deviceInfo.endpoints || [];
    const hasOnOff = endpoints.some(ep => ep.clusters?.includes('onOff'));
    const hasEF00 = endpoints.some(ep => ep.clusters?.includes('0xEF00') || ep.clusters?.includes('tuya'));

    if (hasOnOff || hasEF00) {
      return {
        name: 'required_clusters',
        status: 'pass',
        message: 'Required clusters found (OnOff or Tuya EF00)'
      };
    }

    return {
      name: 'required_clusters',
      status: 'warning',
      message: 'No standard control clusters detected - may need custom driver'
    };
  }

  async _checkNetworkCapacity() {
    try {
      const devices = this.homey.ManagerDevices.getDevices();
      const count = Object.keys(devices).length;

      if (count >= 200) {
        return {
          name: 'network_capacity',
          status: 'warning',
          message: `Network has ${count} devices - approaching capacity limits`
        };
      }

      return {
        name: 'network_capacity',
        status: 'pass',
        message: `Network has ${count} devices - capacity OK`
      };
    } catch (err) {
      return {
        name: 'network_capacity',
        status: 'info',
        message: 'Could not check network capacity'
      };
    }
  }

  _checkKnownIssues(deviceInfo) {
    const { manufacturerName, productId } = deviceInfo;
    const key = `${manufacturerName}:${productId}`;
    const issues = this._knownIssues.get(key) || [];

    if (issues.length === 0) {
      return {
        name: 'known_issues',
        status: 'pass',
        message: 'No known issues for this device'
      };
    }

    const critical = issues.filter(i => i.severity === 'critical');
    if (critical.length > 0) {
      return {
        name: 'known_issues',
        status: 'error',
        message: `${critical.length} critical issue(s) known: ${critical[0].description}`
      };
    }

    return {
      name: 'known_issues',
      status: 'warning',
      message: `${issues.length} known issue(s): ${issues[0].description}`
    };
  }

  _checkFirmwareCompatibility(deviceInfo) {
    const fw = deviceInfo.firmwareVersion;
    if (!fw) {
      return {
        name: 'firmware',
        status: 'info',
        message: 'Firmware version unknown - proceeding with default settings'
      };
    }

    return {
      name: 'firmware',
      status: 'pass',
      message: `Firmware version: ${fw}`
    };
  }

  _initKnownIssues() {
    // Add some common known issues
    this.registerKnownIssue('_TZE200_rhgsbacq', '*', {
      severity: 'warning',
      description: 'Radar sensor may report phantom motion in certain orientations',
      workaround: 'Adjust sensitivity settings after pairing'
    });
  }
}

module.exports = PrePairingCompatibilityCheck;
