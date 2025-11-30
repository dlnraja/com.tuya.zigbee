'use strict';

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
    this.log('🔍 Running full diagnostics...');

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
    this.log('🔍 Diagnostics Results:', JSON.stringify(diagnostics, null, 2));

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
      this.log('[DIAG] ❌ Zigbee health check failed:', error.message);
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
      const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours

      for (const device of Object.values(devices)) {
        result.total++;

        try {
          const available = device.getAvailable ? device.getAvailable() : true;

          if (available) {
            result.online++;

            // Check for stale data
            const lastSeen = device.getStoreValue ?
              await device.getStoreValue('last_data_received') : null;

            if (lastSeen && (now - lastSeen) > staleThreshold) {
              result.stale++;
              result.issues.push(`${device.getName()}: No data for ${Math.round((now - lastSeen) / 3600000)}h`);
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
          const currentDriver = device.driver?.id || 'unknown';

          if (recommendedDrivers[manufacturer]) {
            const recommended = recommendedDrivers[manufacturer];

            if (currentDriver === recommended) {
              result.correct++;
            } else if (currentDriver === 'zigbee_universal') {
              result.mismatched++;
              result.mismatches.push({
                device: device.getName(),
                manufacturer,
                current: currentDriver,
                recommended
              });
            } else {
              result.unknown++;
            }
          }
        } catch (e) {
          // Skip
        }
      }

      this.log(`[DIAG] Drivers: ${result.correct} correct, ${result.mismatched} mismatched`);

    } catch (error) {
      this.log('[DIAG] Driver check failed:', error.message);
    }

    return result;
  }

  /**
   * Check battery reporting health
   */
  async checkBatteryReporting() {
    const result = {
      devicesWithBattery: 0,
      realBatteryData: 0,
      assumedBattery: 0,
      noBattery: 0,
      issues: []
    };

    try {
      const devices = await this.app.getDevices();
      const now = Date.now();
      const freshThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days

      for (const device of Object.values(devices)) {
        try {
          if (device.hasCapability && device.hasCapability('measure_battery')) {
            result.devicesWithBattery++;

            const batteryValue = device.getCapabilityValue ?
              device.getCapabilityValue('measure_battery') : null;

            // Check if we have real battery data
            const lastRealBattery = device.getStoreValue ?
              await device.getStoreValue('last_real_battery') : null;

            if (lastRealBattery && lastRealBattery.source !== 'assumption') {
              const age = now - (lastRealBattery.timestamp || 0);
              if (age < freshThreshold) {
                result.realBatteryData++;
              } else {
                result.assumedBattery++;
                result.issues.push(`${device.getName()}: Battery data stale (${Math.round(age / 86400000)}d old)`);
              }
            } else if (batteryValue === 100) {
              result.assumedBattery++;
              result.issues.push(`${device.getName()}: Battery assumed 100%`);
            } else if (batteryValue === null || batteryValue === undefined) {
              result.noBattery++;
              result.issues.push(`${device.getName()}: No battery value`);
            } else {
              result.realBatteryData++;
            }
          }
        } catch (e) {
          // Skip
        }
      }

      this.log(`[DIAG] Battery: ${result.realBatteryData}/${result.devicesWithBattery} have real data`);

    } catch (error) {
      this.log('[DIAG] Battery check failed:', error.message);
    }

    return result;
  }

  /**
   * Verify data flow is working
   */
  async verifyDataFlow() {
    const result = {
      devicesReceivingData: 0,
      devicesNotReceiving: 0,
      lastDataTimes: [],
      issues: []
    };

    try {
      const devices = await this.app.getDevices();
      const now = Date.now();
      const recentThreshold = 6 * 60 * 60 * 1000; // 6 hours

      for (const device of Object.values(devices)) {
        try {
          const lastReceived = device.getStoreValue ?
            await device.getStoreValue('last_data_received') : null;

          if (lastReceived) {
            const age = now - lastReceived;

            if (age < recentThreshold) {
              result.devicesReceivingData++;
            } else {
              result.devicesNotReceiving++;
              result.issues.push(`${device.getName()}: No data for ${Math.round(age / 3600000)}h`);
            }

            result.lastDataTimes.push({
              device: device.getName(),
              lastData: new Date(lastReceived).toISOString(),
              ageHours: Math.round(age / 3600000)
            });
          } else {
            result.devicesNotReceiving++;
          }
        } catch (e) {
          // Skip
        }
      }

      // Sort by age
      result.lastDataTimes.sort((a, b) => b.ageHours - a.ageHours);
      result.lastDataTimes = result.lastDataTimes.slice(0, 10); // Top 10 oldest

      this.log(`[DIAG] Data flow: ${result.devicesReceivingData} receiving data recently`);

    } catch (error) {
      this.log('[DIAG] Data flow check failed:', error.message);
    }

    return result;
  }

  /**
   * Identify problematic devices based on diagnostics
   */
  _identifyProblematicDevices(diagnostics) {
    const problematic = [];

    // Add devices from various issues
    const issueDevices = new Set();

    for (const category of ['devices', 'drivers', 'batteryReports', 'dataFlow']) {
      if (diagnostics[category]?.issues) {
        for (const issue of diagnostics[category].issues) {
          const match = issue.match(/^([^:]+):/);
          if (match) {
            issueDevices.add(match[1].trim());
          }
        }
      }
    }

    // Add driver mismatches
    if (diagnostics.drivers?.mismatches) {
      for (const mismatch of diagnostics.drivers.mismatches) {
        problematic.push({
          device: mismatch.device,
          issue: 'driver_mismatch',
          details: `Current: ${mismatch.current}, Recommended: ${mismatch.recommended}`
        });
        issueDevices.delete(mismatch.device);
      }
    }

    // Add remaining issues
    for (const deviceName of issueDevices) {
      problematic.push({
        device: deviceName,
        issue: 'multiple_issues',
        details: 'Check device logs'
      });
    }

    return problematic;
  }

  /**
   * Start periodic health checks
   */
  startPeriodicHealthCheck(intervalMs = 3600000) { // Default: 1 hour
    this.stopPeriodicHealthCheck();

    this.log('[DIAG] Starting periodic health checks every', intervalMs / 60000, 'minutes');

    this._healthCheckInterval = setInterval(async () => {
      try {
        await this.runDiagnostics();
      } catch (e) {
        this.log('[DIAG] Periodic check failed:', e.message);
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
