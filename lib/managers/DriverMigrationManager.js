'use strict';
const { safeMultiply } = require('../utils/tuyaUtils.js');

/**
 * DriverMigrationManager - Gestion de migration automatique vers le bon driver
 *
 * Si le device est sur le mauvais driver, propose automatiquement
 * de migrer vers le driver correct
 */

class DriverMigrationManager {

  constructor(homey, identificationDatabase = null) {
    this.homey = homey;
    this.log = homey.log ? homey.log.bind(homey) : console.log;
    this.error = homey.error ? homey.error.bind(homey) : console.error;
    this.identificationDatabase = identificationDatabase;
  }

  /**
   * DÃ©termine le driver optimal basÃ© sur l'analyse du device
   */
  determineBestDriver(deviceInfo, clusterAnalysis) {
    this.log(' [MIGRATION] Determining best driver...');

    const ATTRS = {
      driverId,
      confidence: 0,
      reason: []
    };

    const deviceType = clusterAnalysis.deviceType;
    const powerSource = clusterAnalysis.powerSource;
    const features = clusterAnalysis.features;

    // RÃ¨gles de sÃ©lection de driver

    // SWITCHES
    if (deviceType === 'switch' && powerSource === 'ac') {
      // DÃ©terminer le nombre de gangs basÃ© sur les endpoints
      const gangCount = Object.keys(deviceInfo.endpoints).length;

      if (gangCount === 1) {
        bestDriver.driverId = 'switch_1gang';
        bestDriver.confidence = 0.9;
        bestDriver.reason.push('1 endpoint detected');
      } else if (gangCount === 2) {
        bestDriver.driverId = 'switch_2gang';
        bestDriver.confidence = 0.9;
        bestDriver.reason.push('2 endpoints detected');
      } else if (gangCount === 3) {
        bestDriver.driverId = 'switch_3gang';
        bestDriver.confidence = 0.9;
        bestDriver.reason.push('3 endpoints detected');
      } else if (gangCount === 4) {
        bestDriver.driverId = 'switch_4gang';
        bestDriver.confidence = 0.9;
        bestDriver.reason.push('4 endpoints detected');
      }
    }

    // DIMMERS
    if (deviceType === 'dimmer' && powerSource === 'ac') {
      bestDriver.driverId = 'dimmer_1gang';
      bestDriver.confidence = 0.9;
      bestDriver.reason.push('levelControl cluster detected');
    }

    // USB OUTLETS - PRIORITÃ‰ MAXIMALE (avant outlets normaux)
    // Use intelligent database if available, otherwise fallback to hardcoded list
    let usbOutletManufacturers = [
      '_TZ3000_1obwwnmq', '_TZ3000_w0qqde0g', '_TZ3000_gjnozsaz',
      '_TZ3000_8gs8h2e4', '_TZ3000_vzopcetz', '_TZ3000_g5xawfcq',
      '_TZ3000_h1ipgkwn', '_TZ3000_rdtixbnu', '_TZ3000_2xlvlnvp',
      '_TZ3000_typdpbpg', '_TZ3000_cymsnfvf', '_TZ3000_okaz9tjs',
      '_TZ3000_9hpxg80k', '_TZ3000_wxtp7c5y', '_TZ3000_o005nuxx',
      '_TZ3000_ksw8qtmt', '_TZ3000_7ysdnebc', '_TZ3000_cphmq0q7'
    ];

    //  INTELLIGENT DATABASE: Use live data from all drivers
    if (this.identificationDatabase) {
      const dbManufacturers = this.identificationDatabase.getManufacturerIds('usb_outlet');
      if (dbManufacturers.length > 0) {
        usbOutletManufacturers = dbManufacturers;
        this.log(`    [MIGRATION] Using intelligent database: ${dbManufacturers.length} USB outlet manufacturer IDs`);
      }
    }

    const isUsbOutletByManufacturer = deviceInfo.manufacturer &&
      usbOutletManufacturers.some(id => deviceInfo.manufacturer.toLowerCase().includes(id.toLowerCase()));

    // v5.3.15: FIX - Don't assume 2+ endpoints = USB outlet
    // A switch_2gang also has 2 endpoints but is NOT a USB outlet!
    // Only detect as USB outlet if:
    // 1. Explicitly typed as usb_outlet
    // 2. Manufacturer is known USB outlet brand
    // 3. Current driver contains 'usb' or 'switch' check is negative
    const currentDriverId = this.device?.driver?.id || '';
    const isCurrentlySwitch = currentDriverId.includes('switch');
    const isCurrentlyUsb = currentDriverId.includes('usb');

    if (deviceType === 'usb_outlet' || isUsbOutletByManufacturer || isCurrentlyUsb) {
      // Only recommend USB outlet if NOT currently a switch driver
      if (!isCurrentlySwitch) {
        bestDriver.driverId = 'usb_outlet_advanced';
        bestDriver.confidence = 0.98;
        bestDriver.reason.push('USB outlet detected');
        if (deviceInfo.manufacturer) {
          bestDriver.reason.push(`Manufacturer: ${deviceInfo.manufacturer}`);
        }
      } else {
        // It's a switch, don't change it
        this.log('[MIGRATION]  Skipping USB outlet detection - device is a switch');
      }
    }
    // OUTLETS / PLUGS
    else if (deviceType === 'outlet' && powerSource === 'ac') {
      if (features.includes('measure_power')) {
        bestDriver.driverId = 'plug_energy_monitor';
        bestDriver.confidence = 0.85;
        bestDriver.reason.push('Power monitoring detected');
      } else {
        bestDriver.driverId = 'plug_smart';
        bestDriver.confidence = 0.8;
        bestDriver.reason.push('Simple outlet');
      }
    }

    // LIGHTS
    if (deviceType === 'light') {
      if (features.includes('light_hue')) {
        bestDriver.driverId = 'bulb_rgb';
        bestDriver.confidence = 0.95;
        bestDriver.reason.push('RGB capabilities detected');
      } else if (features.includes('light_temperature')) {
        bestDriver.driverId = 'bulb_tunable_white';
        bestDriver.confidence = 0.9;
        bestDriver.reason.push('Tunable white detected');
      } else if (features.includes('dim')) {
        bestDriver.driverId = 'bulb_dimmable';
        bestDriver.confidence = 0.85;
        bestDriver.reason.push('Dimmable detected');
      } else {
        bestDriver.driverId = 'bulb_white';
        bestDriver.confidence = 0.8;
        bestDriver.reason.push('Simple white bulb');
      }
    }

    // SENSORS
    if (deviceType === 'sensor' && powerSource === 'battery') {
      if (features.includes('alarm_motion')) {
        if (features.includes('measure_temperature') && features.includes('measure_humidity')) {
          bestDriver.driverId = 'motion_sensor';
          bestDriver.confidence = 0.95;
          bestDriver.reason.push('Motion + temp + humidity detected');
        } else {
          bestDriver.driverId = 'motion_sensor';
          bestDriver.confidence = 0.9;
          bestDriver.reason.push('Motion sensor detected');
        }
      } else if (features.includes('alarm_contact')) {
        bestDriver.driverId = 'contact_sensor';
        bestDriver.confidence = 0.9;
        bestDriver.reason.push('Contact sensor detected');
      } else if (features.includes('measure_temperature')) {
        if (features.includes('measure_humidity')) {
          bestDriver.driverId = 'climate_sensor';
          bestDriver.confidence = 0.9;
          bestDriver.reason.push('Temp + humidity sensor');
        } else {
          bestDriver.driverId = 'climate_sensor';
          bestDriver.confidence = 0.85;
          bestDriver.reason.push('Temperature sensor');
        }
      }
    }

    // BUTTONS / REMOTES
    if (deviceType === 'button' && powerSource === 'battery') {
      const buttonCount = Object.keys(deviceInfo.endpoints).length;

      if (buttonCount === 1) {
        bestDriver.driverId = 'button_wireless_1';
        bestDriver.confidence = 0.85;
        bestDriver.reason.push('1 button detected');
      } else if (buttonCount === 2) {
        bestDriver.driverId = 'button_wireless_2';
        bestDriver.confidence = 0.85;
        bestDriver.reason.push('2 buttons detected');
      } else if (buttonCount === 4) {
        bestDriver.driverId = 'button_wireless_4';
        bestDriver.confidence = 0.85;
        bestDriver.reason.push('4 buttons detected');
      }
    }

    // THERMOSTATS
    if (deviceType === 'thermostat') {
      bestDriver.driverId = 'thermostat_ts0601';
      bestDriver.confidence = 0.95;
      bestDriver.reason.push('Thermostat cluster detected');
    }

    // LOCKS
    if (deviceType === 'lock') {
      bestDriver.driverId = 'lock_smart';
      bestDriver.confidence = 0.95;
      bestDriver.reason.push('Door lock cluster detected');
    }

    // WINDOW COVERINGS
    if (deviceType === 'windowcoverings') {
      bestDriver.driverId = 'curtain_motor';
      bestDriver.confidence = 0.95;
      bestDriver.reason.push('Window covering cluster detected');
    }

    this.log(`    Best driver: ${bestDriver.driverId || 'unknown'} (confidence: ${bestDriver.confidence})`);
    this.log(`      Reasons: ${bestDriver.reason.join(', ')}`);

    return bestDriver;
  }

  /**
   * VÃ©rifie si une migration est nÃ©cessaire
   */
  needsMigration(currentDriverId, bestDriverId, confidence) {
    if (!bestDriverId) return false;
    if (currentDriverId === bestDriverId) return false;
    if (confidence < 0.7) return false; // Trop peu de confiance

    return true;
  }

  /**
   * CrÃ©e une notification pour proposer la migration
   */
  async createMigrationNotification(device, bestDriver) {
    const deviceName = device.getName();
    const currentDriver = device.driver.id;

    const notification = {
      excerpt: `Device "${deviceName}" is using wrong driver`,
      message: `
 DRIVER MIGRATION RECOMMENDED

Device: ${deviceName}
Current Driver: ${currentDriver}
Recommended Driver: ${bestDriver.driverId}
Confidence: ${Math.round(bestDriver.confidence)}%)

Reasons:
${bestDriver.reason.map(r => ` ${r}`).join('\n')}

The device will work better with the recommended driver.
You can migrate manually in the device settings.
      `.trim()
    };

    try {
      await device.homey.notifications.createNotification(notification);
      this.log(' [MIGRATION] Migration notification created');
    } catch (err) {
      this.error(' [MIGRATION] Failed to create notification:', err.message);
    }
  }

  /**
   * GÃ©nÃ¨re un rapport de migration
   */
  generateMigrationReport(currentDriverId, bestDriver, needsMigration) {
    const report = [];

    report.push(''.repeat(70));
    report.push(' DRIVER MIGRATION ANALYSIS');
    report.push(''.repeat(70));
    report.push('');
    report.push(` Current Driver: ${currentDriverId}`);
    report.push(` Recommended Driver: ${bestDriver.driverId || 'unknown'}`);
    report.push(` Confidence: ${Math.round(bestDriver.confidence*100)}%`);
    report.push('');
    report.push(' Reasons:');
    bestDriver.reason.forEach(r => report.push(`    ${r}`));
    report.push('');
    report.push(`  Migration Needed: ${needsMigration ? 'YES' : 'NO'}`);

    if (needsMigration) {
      report.push('');
      report.push(' Migration Steps:');
      report.push('   1. Go to device settings');
      report.push('   2. Look for "Change Driver" option');
      report.push(`   3. Select "${bestDriver.driverId}"`);
      report.push('   4. Confirm migration');
      report.push('');
      report.push('   Or use the Smart Adaptation feature to auto-adapt.');
    }

    report.push('');
    report.push(''.repeat(70));

    return report.join('\n');
  }
}

module.exports = DriverMigrationManager;



