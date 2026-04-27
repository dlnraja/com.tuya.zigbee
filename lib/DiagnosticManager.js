'use strict';
const { safeDivide, safeMultiply } = require('./utils/MathUtils.js');

/**
 * DiagnosticManager - Automated diagnostics for Tuya Zigbee devices
 * v5.2.15 - Enhanced health checks and problem detection
 */

class DiagnosticManager {
  constructor(homeyApp) {
    this.homey = homeyApp.homey;
    this.app = homeyApp;
    this._healthCheckInterval = null;
    this._lastDiagnostics = null;
  }

  async runDiagnostics() {
    this.log(' Running full diagnostics...');
    const diagnostics = {
      timestamp: new Date().toISOString(),
      zigbee: await this.checkZigbeeHealth(),
      devices: await this.checkDeviceHealth(),
      drivers: await this.verifyDriverAssignments(),
      batteryReports: await this.checkBatteryReporting(),
      dataFlow: await this.verifyDataFlow(),
      problematicDevices: []
    };
    diagnostics.problematicDevices = this._identifyProblematicDevices(diagnostics);
    this._lastDiagnostics = diagnostics;
    return diagnostics;
  }

  async checkZigbeeHealth() {
    const result = { healthy: true, coordinatorOnline: true, routerCount: 0, endDeviceCount: 0, issues: [] };
    try {
      const devices = await this.app.getDevices();
      for (const device of Object.values(devices)) {
        const data = device.getData ? device.getData() : {};
        if (data.ieeeAddr) {
          if (device.hasCapability && device.hasCapability('measure_battery')) {
            result.endDeviceCount++;
          } else {
            result.routerCount++;
          }
        }
      }
      if (result.routerCount === 0) {
        result.issues.push('No router devices - mesh network may be weak');
        result.healthy = false;
      }
    } catch (error) {
      result.healthy = false;
      result.issues.push(`Zigbee check failed: ${error.message}`);
    }
    return result;
  }

  async checkDeviceHealth() {
    const result = { total: 0, online: 0, offline: 0, stale: 0, issues: [] };
    try {
      const devices = await this.app.getDevices();
      const now = Date.now();
      const staleThreshold = safeMultiply(24, 3600000); // 24 hours

      for (const device of Object.values(devices)) {
        result.total++;
        const available = device.getAvailable ? device.getAvailable() : true;
        if (available) {
          result.online++;
          const lastSeen = device.getStoreValue ? await device.getStoreValue('last_data_received') : null;
          if (lastSeen && (now - lastSeen) > staleThreshold) {
            result.stale++;
            result.issues.push(`${device.getName()}: No data for ${Math.round(safeDivide(now - lastSeen, 3600000))}h`);
          }
        } else {
          result.offline++;
          result.issues.push(`${device.getName()}: Offline`);
        }
      }
    } catch (error) {
      result.issues.push(`Device check failed: ${error.message}`);
    }
    return result;
  }

  async verifyDriverAssignments() {
    const result = { correct: 0, mismatched: 0, unknown: 0, mismatches: [] };
    const recommendedDrivers = {
      '_TZE200_rhgsbacq': 'presence_sensor_radar',
      '_TZE200_3towulqd': 'presence_sensor_radar',
      '_TZE200_a8sdabtg': 'soil_sensor',
      '_TZE200_myd45weu': 'soil_sensor',
      '_TZE200_ppuj1vem': 'pir_sensor_3in1',
      '_TZ3000_u3oupgdy': 'usb_outlet_bseed'
    };
    try {
      const devices = await this.app.getDevices();
      for (const device of Object.values(devices)) {
        const data = device.getData ? device.getData() : {};
        const manufacturer = data.manufacturerName || '';
        const currentDriver = device.driver?.id || 'unknown';
        const recommended = recommendedDrivers[manufacturer];
        if (recommended) {
          if (currentDriver.includes(recommended)) {
            result.correct++;
          } else {
            result.mismatched++;
            result.mismatches.push({ name: device.getName(), model: manufacturer, current: currentDriver, recommended });
          }
        } else {
          result.unknown++;
        }
      }
    } catch (error) {
      this.log('verifyDriverAssignments failed:', error.message);
    }
    return result;
  }

  async checkBatteryReporting() { return { status: 'Not implemented' }; }
  async verifyDataFlow() { return { status: 'Not implemented' }; }
  _identifyProblematicDevices(diag) { return diag.issues || []; }

  startPeriodicHealthCheck(intervalMs = 3600000) {
    if (this._healthCheckInterval) clearInterval(this._healthCheckInterval);
    this._healthCheckInterval = setInterval(async () => {
      try { await this.runDiagnostics(); } catch (e) { this.log('Periodic check error:', e.message); }
    }, intervalMs);
  }

  stopPeriodicHealthCheck() {
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
      this._healthCheckInterval = null;
    }
  }

  getLastDiagnostics() { return this._lastDiagnostics; }

  log(...args) {
    if (this.homey?.log) this.homey.log('[DIAGNOSTIC]', ...args);
    else console.log('[DIAGNOSTIC]', ...args);
  }
}

module.exports = DiagnosticManager;
