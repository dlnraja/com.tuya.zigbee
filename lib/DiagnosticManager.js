'use strict';
const { safeDivide, safeMultiply, safeParse } = require('utils/tuyaUtils.js'); // Fix: NaN Safety


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

  /**
   * Run full diagnostics
   */
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

    // Identify problematic devices
    diagnostics.problematicDevices = this._identifyProblematicDevices(diagnostics);

    this._lastDiagnostics = diagnostics;
    this.log(' Diagnostics Results:', JSON.stringify(diagnostics, null, 2));

    return diagnostics;
  }

  /**
   * Check Zigbee network health
   */
  async checkZigbeeHealth() {
    const result = {
      healthy: true,
      coordinatorOnline: false,
      routerCount: 0,
      endDeviceCount: 0,
      issues: []
    };

    try {
      // Count routers and end devices
      const devices = await this.app.getDevices();

      for (const device of Object.values(devices)) {
        try {
          const data = device.getData ? device.getData() : {};
          if (data.ieeeAddr) {
            // Check if router (mains powered) or end device (battery)
            if (device.hasCapability && device.hasCapability('measure_battery')) {
              result.endDeviceCount++;
            } else {
              result.routerCount++;
            }
          }
        } catch (e) {
          // Skip devices that error
        }
      }

      result.coordinatorOnline = true;

      // Check for issues
      if (result.routerCount === 0) {
        result.issues.push('No router devices - mesh network may be weak');
        result.healthy = false;
      }

      this.log(`[DIAG] Zigbee: ${result.routerCount} routers, ${result.endDeviceCount} end devices`);

    } catch (error) {
      result.healthy = false;
      result.issues.push(`Zigbee check failed: ${error.message}`);
      this.log('[DIAG]  Zigbee health check failed:', error.message);
    }

    return result;
  }

  /**
   * Check individual device health
   */
  async checkDeviceHealth() {
    const result = {
      total: 0,
      online: 0,
      offline: 0,
      stale: 0,
      issues: []
    };

    try {
      const devices = await this.app.getDevices();
      const now = Date.now();
      const staleThreshold =safeMultiply(24, 60) * 60 * 1000; // 24 hours

      for (const device of Object.values(devices)) {
        result.total++;

        try {
          const available = device.getAvailable ? device.getAvailable() : true;

          if (available) {
            result.online++;

            // Check for stale data
            const lastSeen = device.getStoreValue ?
              await device.getStoreValue('last_data_received');

            if (lastSeen && (now - lastSeen) > staleThreshold) {
              result.stale++;
              result.issues.push(`${device.getName()}: No data for ${safeDivide(now - lastSeen, 3600000, 1)}h`);
            }
          } else {
            result.offline++;
            result.issues.push(`${device.getName()}: Offline`);
          }
        } catch (e) {
          // Skip errors
        }
      }

      this.log(`[DIAG] Devices: ${result.online}/${result.total} online, ${result.stale} stale`);

    } catch (error) {
      result.issues.push(`Device check failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Verify driver assignments are correct
   */
  async verifyDriverAssignments() {
    const result = {
      correct: 0,
      mismatched: 0,
      unknown: 0,
      mismatches: []
    };

    // Known problematic model -> recommended driver mappings
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
        try {
          const data = device.getData ? device.getData() : {};
          const manufacturer = data.manufacturerName || '';
          const currentDriver = device.driver?.id || 'unknown';const recommended = recommendedDrivers[manufacturer];

          if (recommended) {
            if (currentDriver.includes(recommended)) {
              result.correct++;
            } else {
              result.mismatched++;
              result.mismatches.push({
                name: device.getName(),
                model: manufacturer,
                current: currentDriver,
                recommended: recommended
              });
            }
          } else {
            result.unknown++;
          }
        } catch (e) {
          // Skip errors
        }
      }
    } catch (error) {
      this.log('[DIAG] verifyDriverAssignments failed:', error.message);
    }

    return result;
  }

  /**
   * Start periodic health checks
   */
  startPeriodicHealthCheck(intervalMs = 3600000) {
    if (this._healthCheckInterval) clearInterval(this._healthCheckInterval);

    this._healthCheckInterval = setInterval(async () => {
      try {
        await this.runDiagnostics();
      } catch (e) {
        this.log('[DIAG] Periodic check error:', e.message);
      }
    }, intervalMs);
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicHealthCheck() {
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
      this._healthCheckInterval = null;
    }
  }

  /**
   * Get last diagnostics result
   */
  getLastDiagnostics() {
    return this._lastDiagnostics;
  }

  /**
   * Log helper
   */
  log(...args) {
    if (this.homey?.log) {
      this.homey.log('[DIAGNOSTIC]', ...args);
    } else {
      console.log('[DIAGNOSTIC]', ...args);
    }
  }
}

module.exports = DiagnosticManager;
