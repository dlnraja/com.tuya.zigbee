'use strict';

/**
 * Emergency Device Fix System - v5.2.30
 *
 * Addresses critical issues:
 * 1. Migration errors (soil_sensor → soil_sensor)
 * 2. DPs Received: 0 (force DP collection)
 * 3. Driver recognition issues
 * 4. Battery not updating
 *
 * Usage:
 *   const EmergencyFix = require('./lib/emergency/EmergencyDeviceFix');
 *   await EmergencyFix.runAll(this.homey);
 */

const DeviceFingerprintDB = require('../tuya/DeviceFingerprintDB');

// Driver alias map for migration fixes
const DRIVER_ALIAS_MAP = {
  'soil_sensor': 'soil_sensor',
  'climate_monitor': 'climate_sensor',
  'temp_humidity_ts0201': 'climate_sensor',
  'motion_sensor_pir': 'motion_sensor',
  'motion_sensor_mmwave': 'motion_sensor_radar_mmwave',
  'plug_smart_basic': 'plug_smart',
  'switch_basic_1gang': 'switch_1gang',
  'switch_basic_2gang': 'switch_2gang',
  'thermostat_smart': 'thermostat_ts0601',
  'presence_sensor': 'presence_sensor_radar'
};

// Known problematic devices and their fixes
const KNOWN_DEVICE_FIXES = {
  '_TZE284_vvmbj46n': {
    correctDriver: 'climate_sensor',
    forceCapabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    dpMapping: { 1: 'temperature', 2: 'humidity', 4: 'battery' }
  },
  '_TZE284_oitavov2': {
    correctDriver: 'soil_sensor',
    forceCapabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    dpMapping: { 3: 'temperature', 4: 'humidity', 7: 'soil_moisture', 14: 'battery' }
  },
  '_TZE200_rhgsbacq': {
    correctDriver: 'motion_sensor_radar_mmwave',
    forceCapabilities: ['alarm_motion', 'measure_battery', 'measure_luminance'],
    dpMapping: { 1: 'presence', 15: 'battery', 101: 'illuminance' }
  },
  '_TZ3000_0dumfk2z': {
    correctDriver: 'button_emergency_sos',
    forceCapabilities: ['alarm_generic', 'measure_battery'],
    dpMapping: { 1: 'button_press', 101: 'battery' }
  },
  '_TZ3000_h1ipgkwn': {
    correctDriver: 'switch_2gang',
    forceCapabilities: ['onoff'],
    forceMains: true,
    dpMapping: {}
  }
};

class EmergencyDeviceFix {

  /**
   * Run all emergency fixes
   */
  static async runAll(homey) {
    console.log('🚨 ═══════════════════════════════════════════════════════════════');
    console.log('🚨 EMERGENCY DEVICE FIX - Starting comprehensive repair...');
    console.log('🚨 ═══════════════════════════════════════════════════════════════');

    const results = {
      migrationFixed: 0,
      devicesFixed: 0,
      dpRequestsSent: 0,
      errors: []
    };

    try {
      // 1. Fix stuck migrations
      console.log('\n[1/4] Fixing stuck migrations...');
      results.migrationFixed = await this.fixStuckMigrations(homey);

      // 2. Fix problematic devices
      console.log('\n[2/4] Fixing problematic devices...');
      results.devicesFixed = await this.fixProblematicDevices(homey);

      // 3. Force DP collection
      console.log('\n[3/4] Forcing DP collection...');
      results.dpRequestsSent = await this.forceDataCollection(homey);

      // 4. Clear error states
      console.log('\n[4/4] Clearing error states...');
      await this.clearErrorStates(homey);

    } catch (error) {
      console.error('🚨 Emergency fix error:', error);
      results.errors.push(error.message);
    }

    console.log('\n🚨 ═══════════════════════════════════════════════════════════════');
    console.log('🚨 EMERGENCY FIX COMPLETE');
    console.log(`🚨   Migrations fixed: ${results.migrationFixed}`);
    console.log(`🚨   Devices fixed: ${results.devicesFixed}`);
    console.log(`🚨   DP requests sent: ${results.dpRequestsSent}`);
    console.log(`🚨   Errors: ${results.errors.length}`);
    console.log('🚨 ═══════════════════════════════════════════════════════════════');

    return results;
  }

  /**
   * Fix stuck migrations with invalid driver IDs
   */
  static async fixStuckMigrations(homey) {
    let fixed = 0;

    try {
      const migrationKey = 'tuya_migration_queue_v1';
      const queue = (await homey.settings.get(migrationKey)) || [];

      if (queue.length === 0) {
        console.log('[MIGRATION] No pending migrations');
        return 0;
      }

      console.log(`[MIGRATION] Found ${queue.length} pending migration(s)`);

      const validQueue = [];

      for (const job of queue) {
        const { targetDriverId } = job;

        // Check if driver ID needs alias resolution
        const resolvedDriverId = DRIVER_ALIAS_MAP[targetDriverId] || targetDriverId;

        if (resolvedDriverId !== targetDriverId) {
          console.log(`[MIGRATION] ✅ Resolved alias: ${targetDriverId} → ${resolvedDriverId}`);
          job.targetDriverId = resolvedDriverId;
          fixed++;
        }

        // Verify driver exists
        try {
          homey.drivers.getDriver(resolvedDriverId);
          validQueue.push(job);
        } catch (e) {
          console.log(`[MIGRATION] ⚠️ Skipping invalid driver: ${resolvedDriverId}`);
          fixed++;
        }
      }

      // Save cleaned queue
      await homey.settings.set(migrationKey, validQueue);
      console.log(`[MIGRATION] Queue cleaned: ${queue.length} → ${validQueue.length}`);

    } catch (error) {
      console.error('[MIGRATION] Fix error:', error.message);
    }

    return fixed;
  }

  /**
   * Fix devices with wrong drivers or missing capabilities
   */
  static async fixProblematicDevices(homey) {
    let fixed = 0;

    try {
      const drivers = homey.drivers.getDrivers();

      for (const driver of Object.values(drivers)) {
        const devices = driver.getDevices();

        for (const device of devices) {
          try {
            const manufacturer = device.getSetting('zb_manufacturer_name');
            const model = device.getSetting('zb_product_id');

            if (!manufacturer) continue;

            // Check if device has known fix
            const fix = KNOWN_DEVICE_FIXES[manufacturer];
            if (fix) {
              console.log(`[DEVICE-FIX] Checking ${device.getName()} (${manufacturer})`);

              // Verify capabilities
              for (const cap of fix.forceCapabilities || []) {
                if (!device.hasCapability(cap)) {
                  console.log(`[DEVICE-FIX] ⚠️ Missing capability: ${cap}`);
                  try {
                    await device.addCapability(cap);
                    console.log(`[DEVICE-FIX] ✅ Added capability: ${cap}`);
                    fixed++;
                  } catch (e) {
                    console.log(`[DEVICE-FIX] Cannot add ${cap}:`, e.message);
                  }
                }
              }

              // Store DP mapping for device
              if (fix.dpMapping && Object.keys(fix.dpMapping).length > 0) {
                await device.setStoreValue('emergency_dp_mapping', fix.dpMapping).catch(() => { });
              }
            }

            // Also check fingerprint DB
            const fingerprint = DeviceFingerprintDB.getFingerprint(manufacturer);
            if (fingerprint && fingerprint.capabilities) {
              for (const cap of fingerprint.capabilities) {
                if (!device.hasCapability(cap)) {
                  try {
                    await device.addCapability(cap);
                    console.log(`[DEVICE-FIX] ✅ Added from fingerprint: ${cap}`);
                    fixed++;
                  } catch (e) {
                    // Capability may not exist
                  }
                }
              }
            }

          } catch (deviceError) {
            console.error(`[DEVICE-FIX] Error on ${device.getName()}:`, deviceError.message);
          }
        }
      }

    } catch (error) {
      console.error('[DEVICE-FIX] Error:', error.message);
    }

    return fixed;
  }

  /**
   * Force DP collection on all Tuya devices
   */
  static async forceDataCollection(homey) {
    let requestsSent = 0;

    try {
      const drivers = homey.drivers.getDrivers();

      for (const driver of Object.values(drivers)) {
        const devices = driver.getDevices();

        for (const device of devices) {
          try {
            const model = device.getSetting('zb_product_id');

            // Only process TS0601 devices (Tuya DP protocol)
            if (model !== 'TS0601') continue;

            console.log(`[DP-FORCE] Requesting DPs for ${device.getName()}...`);

            // Try to force DP request via TuyaEF00Manager
            if (device.tuyaEF00Manager && typeof device.tuyaEF00Manager.requestCriticalDPs === 'function') {
              await device.tuyaEF00Manager.requestCriticalDPs();
              requestsSent++;
              continue;
            }

            // Fallback: try direct cluster access
            const zclNode = device.zclNode;
            if (!zclNode) continue;

            const endpoint = zclNode.endpoints?.[1];
            if (!endpoint) continue;

            const tuyaCluster = endpoint.clusters.tuya
              || endpoint.clusters.tuyaSpecific
              || endpoint.clusters[61184];

            if (tuyaCluster && typeof tuyaCluster.getData === 'function') {
              // Request critical DPs (1-10, 14-15, 101-102)
              const criticalDPs = [1, 2, 3, 4, 5, 6, 7, 14, 15, 101, 102];

              for (const dp of criticalDPs) {
                try {
                  const seq = Math.floor(Math.random() * 65535);
                  const dpBuffer = Buffer.from([dp]);

                  await Promise.race([
                    tuyaCluster.getData({ seq, datapoints: dpBuffer }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
                  ]);

                  requestsSent++;
                } catch (e) {
                  // Timeout is normal for battery devices
                }
              }
            }

          } catch (deviceError) {
            // Silent fail for individual devices
          }
        }
      }

    } catch (error) {
      console.error('[DP-FORCE] Error:', error.message);
    }

    return requestsSent;
  }

  /**
   * Clear error states from settings
   */
  static async clearErrorStates(homey) {
    try {
      // Clear any stuck error flags
      const keysToCheck = [
        'tuya_migration_errors',
        'device_init_errors',
        'dp_collection_errors'
      ];

      for (const key of keysToCheck) {
        try {
          await homey.settings.unset(key);
        } catch (e) {
          // Key may not exist
        }
      }

      console.log('[CLEANUP] ✅ Error states cleared');

    } catch (error) {
      console.error('[CLEANUP] Error:', error.message);
    }
  }

  /**
   * Get device diagnostic info
   */
  static async getDiagnostics(homey) {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      devices: [],
      issues: []
    };

    try {
      const drivers = homey.drivers.getDrivers();

      for (const driver of Object.values(drivers)) {
        const devices = driver.getDevices();

        for (const device of devices) {
          const deviceInfo = {
            name: device.getName(),
            driver: driver.id,
            manufacturer: device.getSetting('zb_manufacturer_name'),
            model: device.getSetting('zb_product_id'),
            capabilities: device.getCapabilities(),
            capabilityValues: {}
          };

          // Get capability values
          for (const cap of device.getCapabilities()) {
            deviceInfo.capabilityValues[cap] = device.getCapabilityValue(cap);
          }

          // Check for issues
          if (deviceInfo.capabilityValues.measure_battery === null) {
            diagnostics.issues.push({
              device: deviceInfo.name,
              issue: 'Battery null',
              manufacturer: deviceInfo.manufacturer
            });
          }

          diagnostics.devices.push(deviceInfo);
        }
      }

    } catch (error) {
      diagnostics.error = error.message;
    }

    return diagnostics;
  }
}

module.exports = EmergencyDeviceFix;
