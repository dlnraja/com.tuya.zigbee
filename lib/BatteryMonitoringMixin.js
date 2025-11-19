'use strict';

const BatteryCalculator = require('./BatteryCalculator');
const PowerSourceDetector = require('./PowerSourceDetector');
const { CLUSTER } = require('zigbee-clusters');

/**
 * BatteryMonitoringMixin - Mixin réutilisable pour monitoring batterie amélioré
 *
 * Usage dans un driver:
 *   const BatteryMonitoringMixin = require('../../lib/BatteryMonitoringMixin');
 *
 *   class MyDevice extends BatteryMonitoringMixin(ZigBeeDevice) {
 *     async onNodeInit() {
 *       await super.onNodeInit();
 *       await this.setupBatteryMonitoring();
 *     }
 *   }
 */

const BatteryMonitoringMixin = (Base) => class extends Base {
  /**
   * Setup complet du monitoring batterie avec best practices
   * @param {Object} options - Options de configuration
   * @returns {Promise<void>}
   */
  async setupBatteryMonitoring(options = {}) {
    this.log('🔋 [BATTERY] Starting battery monitoring setup...');

    // Vérifier si device est sur secteur
    if (PowerSourceDetector.isPowered(this)) {
      this.log('⚡ [BATTERY] Device is mains-powered - SKIPPING battery monitoring');
      return;
    }

    // Initialiser calculator
    this.batteryCalculator = new BatteryCalculator();

    // Déterminer type de device
    const deviceType = options.deviceType || PowerSourceDetector.getDeviceType(this);
    this.log(`📊 [BATTERY] Device type: ${deviceType}`);

    // Obtenir configuration optimale
    const reportConfig = PowerSourceDetector.getConfigWithUserSettings(this, deviceType);
    this.log(`⚙️ [BATTERY] Report config:`, reportConfig);

    // Vérifier si capability existe
    if (!this.hasCapability('measure_battery')) {
      this.log('⚠️ [BATTERY] No measure_battery capability - skipping');
      return;
    }

    // Configurer le cluster Power Configuration
    await this.configureBatteryCluster(reportConfig, options);

    // Lecture initiale proactive
    if (options.proactiveRead !== false) {
      await this.performInitialBatteryRead();
    }

    this.log('✅ [BATTERY] Battery monitoring setup complete');
  }

  /**
   * Configure le cluster Power Configuration pour batterie
   * @param {Object} reportConfig - Configuration reporting
   * @param {Object} options - Options additionnelles
   * @returns {Promise<void>}
   */
  async configureBatteryCluster(reportConfig, options = {}) {
    try {
      this.log('⚙️ [BATTERY] Configuring Power Configuration cluster...');

      // Déterminer endpoint (par défaut 1)
      const endpoint = options.endpoint || 1;

      // Configurer reporting
      if (options.skipReporting !== true) {
        try {
          await this.configureAttributeReporting([{
            endpointId: endpoint,
            cluster: CLUSTER.POWER_CONFIGURATION,
            attributeName: 'batteryPercentageRemaining',
            minInterval: reportConfig.minInterval,
            maxInterval: reportConfig.maxInterval,
            minChange: reportConfig.minChange
          }]);

          this.log('✅ [BATTERY] Reporting configured successfully');
          this.log(`   Min: ${reportConfig.minInterval}s (${Math.round(reportConfig.minInterval / 60)}min)`);
          this.log(`   Max: ${reportConfig.maxInterval}s (${Math.round(reportConfig.maxInterval / 3600)}h)`);
          this.log(`   Change: ${reportConfig.minChange} (${reportConfig.minChange / 2}%)`);
        } catch (err) {
          this.log('⚠️ [BATTERY] Reporting config failed (non-critical):', err.message);
        }
      }

      // Enregistrer capability avec parser amélioré
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        endpoint,
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: async (value) => {
          return await this.parseBatteryValue(value, options);
        },
        getOpts: {
          getOnStart: true,
          getOnOnline: true
        }
      });

      this.log('✅ [BATTERY] Capability registered with enhanced parser');

    } catch (err) {
      this.error('❌ [BATTERY] Cluster configuration failed:', err);
      throw err;
    }
  }

  /**
   * Parse valeur batterie avec logging détaillé
   * @param {number} rawValue - Valeur brute du cluster
   * @param {Object} options - Options de parsing
   * @returns {Promise<number>} Pourcentage batterie (0-100)
   */
  async parseBatteryValue(rawValue, options = {}) {
    const debugMode = this.getSetting('battery_debug_logging') !== false;

    if (debugMode) {
      this.log('─────────────────────────────────────');
      this.log('🔋 BATTERY VALUE RECEIVED');
      this.log(`   Raw value: ${rawValue} (0-200 scale)`);
    }

    // Calculer pourcentage avec BatteryCalculator
    const modelId = this.getData().modelId || 'unknown';
    let percentage = this.batteryCalculator.calculate(rawValue, modelId);

    // Appliquer limites (0-100%)
    percentage = Math.max(0, Math.min(100, percentage));

    // Obtenir valeur précédente pour comparaison
    const previousValue = this.getCapabilityValue('measure_battery');
    const hasChanged = previousValue === null || Math.abs(percentage - previousValue) >= 1;

    if (debugMode) {
      this.log(`   Calculated: ${percentage.toFixed(1)}%`);
      this.log(`   Previous: ${previousValue !== null ? previousValue.toFixed(1) + '%' : 'N/A'}`);
      this.log(`   Change: ${hasChanged ? '✅ YES' : '⏭️ NO (< 1%)'}`);
      this.log(`   Timestamp: ${new Date().toISOString()}`);
    }

    // Mettre à jour alarme batterie faible
    if (hasChanged) {
      await this.updateBatteryAlarm(percentage);
    }

    if (debugMode) {
      this.log('─────────────────────────────────────');
    } else {
      this.log(`🔋 Battery: ${percentage.toFixed(1)}% (was ${previousValue?.toFixed(1) || 'N/A'}%)`);
    }

    return percentage;
  }

  /**
   * Met à jour l'alarme batterie faible
   * @param {number} percentage - Pourcentage batterie actuel
   * @returns {Promise<void>}
   */
  async updateBatteryAlarm(percentage) {
    if (!this.hasCapability('alarm_battery')) {
      return;
    }

    try {
      const threshold = this.getSetting('battery_low_threshold') || 20;
      const isLow = percentage < threshold;
      const currentAlarm = this.getCapabilityValue('alarm_battery');

      // Ne mettre à jour que si changement
      if (currentAlarm !== isLow) {
        await this.setCapabilityValue('alarm_battery', isLow);

        if (isLow) {
          this.log(`⚠️ [BATTERY ALARM] TRIGGERED! ${percentage.toFixed(1)}% < ${threshold}%`);

          // Optionnel: trigger flow card
          if (this.homey.flow) {
            try {
              const flowCard = this.homey.flow.getDeviceTriggerCard('battery_low');
              if (flowCard) {
                await flowCard.trigger(this, { percentage, threshold });
              }
            } catch (flowErr) {
              // Flow card peut ne pas exister
            }
          }
        } else {
          this.log(`✅ [BATTERY ALARM] CLEARED! ${percentage.toFixed(1)}% >= ${threshold}%`);
        }
      }
    } catch (err) {
      this.error('❌ [BATTERY ALARM] Update failed:', err);
    }
  }

  /**
   * Lecture proactive de la batterie au démarrage
   * @returns {Promise<void>}
   */
  async performInitialBatteryRead() {
    this.log('🔍 [BATTERY] Performing initial proactive read...');

    try {
      // Attendre que device soit prêt
      await this.wait(2000);

      // Lire attribut batterie
      const endpoint = this.zclNode?.endpoints?.[1];
      if (!endpoint) {
        this.log('⚠️ [BATTERY] Endpoint 1 not available for proactive read');
        return;
      }

      const result = await endpoint.clusters.powerConfiguration.readAttributes([
        'batteryPercentageRemaining'
      ]);

      this.log('✅ [BATTERY] Proactive read result:', result);

      // Parser et mettre à jour
      if (result?.batteryPercentageRemaining !== undefined) {
        const percentage = await this.parseBatteryValue(
          result.batteryPercentageRemaining,
          { skipLogging: false }
        );

        await this.setCapabilityValue('measure_battery', percentage);
        this.log(`🎯 [BATTERY] Initial value set: ${percentage.toFixed(1)}%`);
      }
    } catch (err) {
      this.log('⚠️ [BATTERY] Proactive read failed (will retry on next report):', err.message);
      // Non-critique - le reporting configuré prendra le relais
    }
  }

  /**
   * Utilitaire wait
   * @param {number} ms - Millisecondes à attendre
   * @returns {Promise<void>}
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtenir statistiques batterie pour diagnostic
   * @returns {Object} Stats batterie
   */
  getBatteryStats() {
    return {
      current: this.getCapabilityValue('measure_battery'),
      alarm: this.getCapabilityValue('alarm_battery'),
      threshold: this.getSetting('battery_low_threshold') || 20,
      isPowered: PowerSourceDetector.isPowered(this),
      lastUpdate: this.getCapabilityLastUpdated('measure_battery'),
      deviceType: PowerSourceDetector.getDeviceType(this)
    };
  }
};

module.exports = BatteryMonitoringMixin;
