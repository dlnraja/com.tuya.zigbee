'use strict';

/**
 * Diagnostic Report Export - FEATURE #57
 *
 * Generates and exports comprehensive diagnostic reports:
 * - Network health report
 * - Device status report
 * - Performance metrics
 * - Error logs
 * - Exportable as JSON/text
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class DiagnosticReportExport extends EventEmitter {
  constructor(homey, options = {}) {
    super();
    this.homey = homey;
    this.maxLogEntries = options.maxLogEntries || 500;
    this._logEntries = [];
  }

  /**
   * Add a log entry
   * @param {string} level - 'info' | 'warn' | 'error' | 'debug'
   * @param {string} category
   * @param {string} message
   * @param {Object} [meta]
   */
  log(level, category, message, meta = {}) {
    const entry = {
      timestamp: Date.now(),
      date: new Date().toISOString(),
      level,
      category,
      message,
      ...meta
    };

    this._logEntries.push(entry);

    if (this._logEntries.length > this.maxLogEntries) {
      this._logEntries = this._logEntries.slice(-this.maxLogEntries);
    }
  }

  /**
   * Generate a full diagnostic report
   * @returns {Object} Comprehensive report
   */
  async generateReport() {
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        appVersion: this._getAppVersion(),
        homeyVersion: this._getHomeyVersion()
      },
      network: await this._getNetworkReport(),
      devices: await this._getDeviceReport(),
      performance: await this._getPerformanceReport(),
      errors: this._getErrorReport(),
      battery: await this._getBatteryReport(),
      recentLogs: this._logEntries.slice(-100)
    };

    return report;
  }

  /**
   * Export report as text
   */
  async exportAsText() {
    const report = await this.generateReport();
    return this._formatAsText(report);
  }

  /**
   * Export report as JSON
   */
  async exportAsJSON() {
    return this.generateReport();
  }

  /**
   * Get quick health summary
   */
  async getHealthSummary() {
    const devices = this.homey.ManagerDevices.getDevices();
    const deviceList = Object.values(devices);

    const online = deviceList.filter(d => d.getAvailable ? d.getAvailable() : true).length;
    const offline = deviceList.length - online;

    const errorCount = this._logEntries.filter(e => e.level === 'error').length;
    const warnCount = this._logEntries.filter(e => e.level === 'warn').length;

    return {
      totalDevices: deviceList.length,
      onlineDevices: online,
      offlineDevices: offline,
      healthScore: deviceList.length > 0 ? Math.round((online / deviceList.length) * 100) : 100,
      recentErrors: errorCount,
      recentWarnings: warnCount,
      timestamp: Date.now()
    };
  }

  async _getNetworkReport() {
    return {
      coordinatorOnline: true,
      routerCount: 0,
      endDeviceCount: 0,
      averageSignalQuality: null
    };
  }

  async _getDeviceReport() {
    const devices = this.homey.ManagerDevices.getDevices();
    const report = { total: 0, online: 0, offline: 0, devices: [] };

    for (const device of Object.values(devices)) {
      report.total++;
      const available = device.getAvailable ? device.getAvailable() : true;
      if (available) report.online++;
      else report.offline++;

      report.devices.push({
        id: device.id,
        name: device.getName(),
        driver: device.driver?.id,
        available,
        capabilities: device.capabilities || []
      });
    }

    return report;
  }

  async _getPerformanceReport() {
    return {
      memoryUsage: process.memoryUsage ? process.memoryUsage() : null,
      uptime: process.uptime ? Math.round(process.uptime()) : null
    };
  }

  _getErrorReport() {
    return this._logEntries
      .filter(e => e.level === 'error')
      .slice(-50)
      .map(e => ({
        timestamp: e.date,
        category: e.category,
        message: e.message
      }));
  }

  async _getBatteryReport() {
    const devices = this.homey.ManagerDevices.getDevices();
    const batteryDevices = [];

    for (const device of Object.values(devices)) {
      if (device.hasCapability && device.hasCapability('measure_battery')) {
        const value = device.getCapabilityValue ? device.getCapabilityValue('measure_battery') : null;
        batteryDevices.push({
          id: device.id,
          name: device.getName(),
          battery: value,
          status: value !== null ? (value <= 10 ? 'critical' : value <= 25 ? 'low' : 'good') : 'unknown'
        });
      }
    }

    return batteryDevices;
  }

  _getAppVersion() {
    try {
      const version = require('../../lib/version');
      return version.version || 'unknown';
    } catch (e) {
      return 'unknown';
    }
  }

  _getHomeyVersion() {
    try {
      return this.homey.version || 'unknown';
    } catch (e) {
      return 'unknown';
    }
  }

  _formatAsText(report) {
    const lines = [];
    lines.push('=== Tuya Zigbee Diagnostic Report ===');
    lines.push(`Generated: ${report.metadata.generatedAt}`);
    lines.push(`App Version: ${report.metadata.appVersion}`);
    lines.push('');
    lines.push('--- Network ---');
    lines.push(`  Coordinator: ${report.network.coordinatorOnline ? 'Online' : 'Offline'}`);
    lines.push('');
    lines.push('--- Devices ---');
    lines.push(`  Total: ${report.devices.total}`);
    lines.push(`  Online: ${report.devices.online}`);
    lines.push(`  Offline: ${report.devices.offline}`);
    lines.push('');
    lines.push('--- Battery ---');
    for (const b of report.battery) {
      lines.push(`  ${b.name}: ${b.battery}% (${b.status})`);
    }
    lines.push('');
    lines.push('--- Recent Errors ---');
    for (const e of report.errors.slice(-10)) {
      lines.push(`  [${e.date}] ${e.category}: ${e.message}`);
    }
    lines.push('');
    lines.push('=== End Report ===');

    return lines.join('\n');
  }

  destroy() {
    this._logEntries = [];
  }
}

module.exports = DiagnosticReportExport;
