'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const SmartDriverAdaptation = require('../managers/SmartDriverAdaptation');
const DriverMigrationManager = require('../managers/DriverMigrationManager');
const DiagnosticLogsCollector = require('../diagnostics/DiagnosticLogsCollector');

/**
 * TuyaZigbeeDevice - Base class for all Tuya Zigbee devices
 * Provides common functionality for Tuya devices
 * NOW WITH:
 * - 🤖 INTELLIGENT DRIVER ADAPTATION
 * - 📊 COMPREHENSIVE DIAGNOSTIC LOGS
 */

// Apply DiagnosticLogsCollector mixin to ZigBeeDevice
const ZigBeeDeviceWithDiagnostics = DiagnosticLogsCollector(ZigBeeDevice);

class TuyaZigbeeDevice extends ZigBeeDeviceWithDiagnostics {

  /**
   * onNodeInit is called when the device is initialized
   */
  async onNodeInit() {
    this.log('TuyaZigbeeDevice initialized');

    // Enable debug logging if needed
    this.enableDebug();

    // Print cluster information
    this.printNode();

    // 🤖 RUN INTELLIGENT DRIVER ADAPTATION
    await this.runIntelligentAdaptation();
  }

  /**
   * 🤖 INTELLIGENT DRIVER ADAPTATION
   * Détecte automatiquement si le driver est correct et s'adapte
   */
  async runIntelligentAdaptation() {
    // Vérifier si l'adaptation est activée (par défaut: OUI)
    const enableSmartAdaptation = this.getSetting('enable_smart_adaptation');
    if (enableSmartAdaptation === false) {
      this.log('⏩ [SMART ADAPT] Disabled by user setting');
      return;
    }

    this.log('🤖 [SMART ADAPT] Starting intelligent driver adaptation...');

    try {
      // Attendre que le ZCL node soit prêt
      await this.waitForZclNode();

      // Créer l'instance d'adaptation avec base de données intelligente
      const identificationDatabase = this.homey.app?.identificationDatabase || null;
      this.smartAdaptation = new SmartDriverAdaptation(this, identificationDatabase);

      // Exécuter l'analyse et l'adaptation
      const adaptResult = await this.smartAdaptation.analyzeAndAdapt();

      // Sauvegarder le résultat
      this.smartAdaptationResult = adaptResult;

      // Générer le rapport
      const adaptReport = this.smartAdaptation.generateReport(adaptResult);
      this.log(adaptReport);

      // Vérifier si une migration de driver est recommandée
      if (adaptResult.success && adaptResult.deviceInfo) {
        await this.checkDriverMigration(adaptResult);
      }

      // Sauvegarder le rapport dans les settings
      try {
        await this.setSettings({
          smart_adaptation_report: adaptReport,
          smart_adaptation_date: new Date().toISOString(),
          smart_adaptation_success: adaptResult.success
        });
      } catch (err) {
        // Ignore si settings non disponibles
        this.log('⚠️  [SMART ADAPT] Could not save report to settings');
      }

      this.log('✅ [SMART ADAPT] Intelligent adaptation complete');

    } catch (err) {
      this.error('❌ [SMART ADAPT] Failed:', err.message);
      this.error('   Stack:', err.stack);
    }
  }

  /**
   * Vérifie si une migration de driver est nécessaire
   */
  async checkDriverMigration(adaptResult) {
    try {
      this.log('🔍 [MIGRATION] Checking if driver migration is needed...');

      // Créer le manager de migration avec base de données intelligente
      const identificationDatabase = this.homey.app?.identificationDatabase || null;
      const migrationManager = new DriverMigrationManager(this.homey, identificationDatabase);

      // Déterminer le meilleur driver
      const bestDriver = migrationManager.determineBestDriver(
        adaptResult.deviceInfo,
        adaptResult.clusterAnalysis || {}
      );

      // Vérifier si migration nécessaire
      const needsMigration = migrationManager.needsMigration(
        this.driver.id,
        bestDriver.driverId,
        bestDriver.confidence
      );

      // Générer le rapport
      const migrationReport = migrationManager.generateMigrationReport(
        this.driver.id,
        bestDriver,
        needsMigration
      );

      this.log(migrationReport);

      // Si migration nécessaire, créer une notification
      if (needsMigration) {
        this.log('⚠️  [MIGRATION] Driver migration RECOMMENDED!');
        await migrationManager.createMigrationNotification(this, bestDriver);

        // Sauvegarder dans settings
        try {
          await this.setSettings({
            recommended_driver: bestDriver.driverId,
            migration_confidence: bestDriver.confidence,
            migration_reasons: bestDriver.reason.join('; ')
          });
        } catch (err) {
          // Ignore
        }
      } else {
        this.log('✅ [MIGRATION] Driver is CORRECT - No migration needed');
      }

    } catch (err) {
      this.error('❌ [MIGRATION] Failed to check migration:', err.message);
    }
  }

  /**
   * Attend que le ZCL node soit prêt
   */
  async waitForZclNode(maxWaitMs = 10000) {
    const startTime = Date.now();

    while (!this.zclNode && (Date.now() - startTime) < maxWaitMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!this.zclNode) {
      throw new Error('ZCL Node not available after waiting');
    }
  }

  /**
   * Force une nouvelle adaptation (appelable manuellement)
   */
  async forceSmartAdaptation() {
    this.log('🔄 [SMART ADAPT] Forcing re-adaptation...');
    return await this.runIntelligentAdaptation();
  }

  /**
   * Retourne le résultat de l'adaptation
   */
  getSmartAdaptationResult() {
    return this.smartAdaptationResult || null;
  }

  /**
   * onDeleted is called when the user deleted the device
   */
  async onDeleted() {
    this.log('TuyaZigbeeDevice has been deleted');
  }

  /**
   * enableDebug - Enable debug logging for this device
   */
  enableDebug() {
    // Can be overridden in child classes
  }

  /**
   * parseTuyaBatteryValue - Parse Tuya battery value (0-100 or 0-200)
   */
  parseTuyaBatteryValue(value) {
    if (typeof value !== 'number') return null;

    // Tuya devices report battery in 0-100 or 0-200 scale
    const percentage = value <= 100 ? value : value / 2;
    return Math.max(0, Math.min(100, Math.round(percentage)));
  }

  /**
   * registerBatteryCapability - Register battery capability with proper reporting
   */
  async registerBatteryCapability(options = {}) {
    const {
      cluster = 'genPowerCfg',
      attribute = 'batteryPercentageRemaining',
      minInterval = 300,
      maxInterval = 3600,
      minChange = 2
    } = options;

    try {
      await this.registerCapability('measure_battery', cluster, {
        get: attribute,
        report: attribute,
        reportOpts: {
          configureAttributeReporting: {
            minInterval,
            maxInterval,
            minChange
          }
        },
        getOpts: {
          getOnStart: true,
          getOnOnline: true
        },
        reportParser: value => {
          return this.parseTuyaBatteryValue(value);
        }
      });

      this.log('Battery capability registered successfully');
    } catch (err) {
      this.error('Error registering battery capability:', err);
    }
  }

  /**
   * registerOnOffCapability - Register onOff capability
   */
  async registerOnOffCapability() {
    try {
      await this.registerCapability('onoff', 'genOnOff', {
        getOpts: {
          getOnStart: true,
          getOnOnline: true
        }
      });

      this.log('OnOff capability registered successfully');
    } catch (err) {
      this.error('Error registering onoff capability:', err);
    }
  }

  /**
   * registerTemperatureCapability - Register temperature capability
   */
  async registerTemperatureCapability() {
    try {
      await this.registerCapability('measure_temperature', 'msTemperatureMeasurement', {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value / 100,
        getOpts: {
          getOnStart: true
        }
      });

      this.log('Temperature capability registered successfully');
    } catch (err) {
      this.error('Error registering temperature capability:', err);
    }
  }

  /**
   * registerHumidityCapability - Register humidity capability
   */
  async registerHumidityCapability() {
    try {
      await this.registerCapability('measure_humidity', 'msRelativeHumidity', {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value / 100,
        getOpts: {
          getOnStart: true
        }
      });

      this.log('Humidity capability registered successfully');
    } catch (err) {
      this.error('Error registering humidity capability:', err);
    }
  }

  /**
   * registerLuminanceCapability - Register luminance capability with proper LUX conversion
   */
  async registerLuminanceCapability() {
    try {
      await this.registerCapability('measure_luminance', 'msIlluminanceMeasurement', {
        get: 'measuredValue',
        report: 'measuredValue',
        getOpts: {
          getOnStart: true
        },
        reportParser: value => {
          this.log('Luminance raw value:', value);
          // Convert from illuminance to lux
          const lux = value > 0 ? Math.pow(10, (value - 1) / 10000) : 0;
          this.log('Luminance lux:', lux);
          return Math.round(lux);
        }
      });

      this.log('Luminance capability registered successfully');
    } catch (err) {
      this.error('Error registering luminance capability:', err);
    }
  }

}

module.exports = TuyaZigbeeDevice;
