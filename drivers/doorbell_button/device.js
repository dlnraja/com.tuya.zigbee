'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');

/**
 * doorbell_button - Hybrid-Enhanced Driver
 *
 * MIGRATION: Original driver enhanced with Hybrid System
 * - Auto-adaptive capabilities
 * - Energy-aware management
 * - Smart detection
 */

// Create hybrid base
const HybridDevice = HybridDriverSystem.createHybridDevice();

'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');
const batteryConverter = require('../../lib/tuya-engine/converters/battery');
const { CLUSTER } = require('zigbee-clusters');
const TuyaClusterHandler = require('../../utils/tuya-cluster-handler');
const FallbackSystem = require('../../lib/helpers/FallbackSystem');

class SmartDoorbellBatteryDevice extends HybridDevice {

  async onNodeInit({ zclNode }) {
    // Hybrid system initialization
    await super.onNodeInit({ zclNode });

    // Original initialization below:
    // Initialize hybrid base (power detection)
    await super.onNodeInit({ zclNode });

    // Setup IAS Zone (SDK3 - based on Peter's success patterns)
    await this.setupIASZone();

    // IAS Zone enrollment (motion/contact sensors)
    if (this.hasCapability('alarm_motion') || this.hasCapability('alarm_contact') ||
      this.hasCapability('alarm_water') || this.hasCapability('alarm_smoke')) {
      this.iasZoneEnroller = new IASZoneEnroller(this, zclNode);
      await this.iasZoneEnroller.enroll().catch(err => {
        this.error('IAS Zone enrollment failed:', err);
      });
    }

    // ==========================================
    // BATTERY MANAGEMENT - OPTIMIZED
    // ==========================================

    // Configure battery reporting
    try {
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: 1,
        attributeName: 'batteryPercentageRemaining',
        minInterval: 3600,
        maxInterval: 86400,
        minChange: 10
      }]);
      this.log('Battery reporting configured');
    } catch (err) {
      this.log('Battery report config failed (non-critical):', err.message);
    }

    // Register battery capability
    // TODO: Consider debouncing capability updates for better performance
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      endpoint: 1,
      get: 'batteryPercentageRemaining',
      report: 'batteryPercentageRemaining',
      reportParser: (value) => {
        if (value === null || value === undefined) return null;
        // Convert from 0-200 scale to 0-100%
        const percentage = Math.round(value / 2);
        return Math.max(0, Math.min(100, percentage));
      },
      getParser: (value) => {
        if (value === null || value === undefined) return null;
        const percentage = Math.round(value / 2);
        return Math.max(0, Math.min(100, percentage));
      }
    });

    // Initial battery poll after pairing
    setTimeout(async () => {
      try {
        await this.pollAttributes().catch(err => this.error(err));
        this.log('Initial battery poll completed');
      } catch (err) {
        this.error('Initial battery poll failed:', err);
      }
    }, 5000);

    // Regular battery polling with exponential backoff on errors
    let pollFailures = 0;
    const maxPollFailures = 5;

    this.registerPollInterval(async () => {
      try {
        const battery = await this.zclNode.endpoints[1].clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining']).catch(err => this.error(err));

        if (battery && battery.batteryPercentageRemaining !== undefined) {
          const percentage = Math.round(battery.batteryPercentageRemaining / 2);
          await (async () => {
            this.log(`📝 [DIAG] setCapabilityValue: ${'measure_battery'} = ${parseFloat(percentage)}`);
            try {
              await this.setCapabilityValue('measure_battery', parseFloat(percentage));
              this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_battery'}`);
            } catch (err) {
              this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_battery'}`, err.message);
              throw err;
            }
          })().catch(err => this.error(err));
          this.log('Battery polled:', percentage + '%');

          // Reset failure counter on success
          pollFailures = 0;

          // Low battery alert
          if (percentage <= 20 && percentage > 10) {
            this.log('[WARN]  Low battery warning:', percentage + '%');
            await this.homey.notifications.createNotification({
              excerpt: `${this.getName()} battery low (${percentage}%)`
            }).catch(() => { });
          }

          // Critical battery alert
          if (percentage <= 10) {
            this.log('🔴 Critical battery:', percentage + '%');
            await this.homey.notifications.createNotification({
              excerpt: `${this.getName()} battery critical (${percentage}%) - replace soon!`
            }).catch(() => { });
          }
        }
      } catch (err) {
        pollFailures++;
        this.error(`Battery poll failed (${pollFailures}/${maxPollFailures}):`, err.message);

        // Stop polling after max failures to preserve battery
        if (pollFailures >= maxPollFailures) {
          this.log('Max poll failures reached, reducing poll frequency');
          // Polling will continue but less frequently
        }
      }
    }, 300000);
    // Force initial read après pairing (résout données non visibles)
    setTimeout(() => {
      this.pollAttributes().catch(err => this.error('Initial poll failed:', err));
    }, 5000);

    // Poll attributes régulièrement pour assurer visibilité données
    this.registerPollInterval(async () => {
      try {
        // Force read de tous les attributes critiques
        await this.pollAttributes().catch(err => this.error(err));
      } catch (err) {
        this.error('Poll failed:', err);
      }
    }, 300000); // 5 minutes

    this.log('smart_doorbell_battery initialized');

    // Call parent
    try {
      await super.onNodeInit({ zclNode }).catch(err => this.error(err));
      // Initialize Fallback System
      this.fallback = new FallbackSystem(this, {
        maxRetries: 3,
        baseDelay: 1000,
        verbosity: this.getSetting('debug_level') || 'INFO',
        trackPerformance: true
      });
      this.log('[OK] FallbackSystem initialized');
    } catch (err) { this.error('Await error:', err); }

    // Auto-detect device type and initialize Tuya cluster handler
    const deviceType = TuyaClusterHandler.detectDeviceType('smart_doorbell_battery');
    const tuyaInitialized = await TuyaClusterHandler.init(this, zclNode, deviceType).catch(err => this.error(err));

    if (tuyaInitialized) {
      this.log('[OK] Tuya cluster handler initialized for type:', deviceType);
    } else {
      this.log('[WARN]  No Tuya cluster found, using standard Zigbee');

      // Fallback to standard cluster handling if needed
      try {
        await this.registerStandardCapabilities().catch(err => this.error(err));
      } catch (err) { this.error('Await error:', err); }
    }

    // Mark device as available
    await this.setAvailable().catch(err => this.error(err));
  }

  // ========================================
  // FLOW METHODS - Auto-generated
  // ========================================

  /**
   * Trigger flow with context data
   */
  async triggerFlowCard(cardId, tokens = {}) {
    try {
      const flowCard = this.homey.flow.getDeviceTriggerCard(cardId);
      await flowCard.trigger(this, tokens).catch(err => this.error(err));
      this.log(`[OK] Flow triggered: ${cardId}`, tokens);
    } catch (err) {
      this.error(`[ERROR] Flow trigger error: ${cardId}`, err);
    }
  }

  /**
   * Check if any alarm is active
   */
  async checkAnyAlarm() {
    const capabilities = this.getCapabilities();
    for (const cap of capabilities) {
      if (cap.startsWith('alarm_')) {
        const value = this.getCapabilityValue(cap);
        if (value === true) return true;
      }
    }
    return false;
  }

  /**
   * Get current context data
   */
  getContextData() {
    const context = {
      time_of_day: this.getTimeOfDay(),
      timestamp: new Date().toISOString()
    };

    // Add available sensor values
    const caps = this.getCapabilities();
    if (caps.includes('measure_luminance')) {
      context.luminance = this.getCapabilityValue('measure_luminance') || 0;
    }
    if (caps.includes('measure_temperature')) {
      context.temperature = this.getCapabilityValue('measure_temperature') || 0;
    }
    if (caps.includes('measure_humidity')) {
      context.humidity = this.getCapabilityValue('measure_humidity') || 0;
    }
    if (caps.includes('measure_battery')) {
      context.battery = this.getCapabilityValue('measure_battery') || 0;
    }

    return context;
  }

  /**
   * Get time of day
   */
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }



  /**
   * Poll tous les attributes pour forcer mise à jour
   * Résout: Données non visibles après pairing (Peter + autres)
   */
  async pollAttributes() {
    const promises = [];

    // Battery
    if (this.hasCapability('measure_battery')) {
      promises.push(
        // TODO: Wrap in try/catch
        this.zclNode.endpoints[1]?.clusters.powerConfiguration?.readAttributes(['batteryPercentageRemaining'])
          .catch(err => this.log('Battery read failed (ignorable):', err.message))
      );
    }

    // Temperature
    if (this.hasCapability('measure_temperature')) {
      promises.push(
        // TODO: Wrap in try/catch
        this.zclNode.endpoints[1]?.clusters.temperatureMeasurement?.readAttributes(['measuredValue'])
          .catch(err => this.log('Temperature read failed (ignorable):', err.message))
      );
    }

    // Humidity
    if (this.hasCapability('measure_humidity')) {
      promises.push(
        // TODO: Wrap in try/catch
        this.zclNode.endpoints[1]?.clusters.relativeHumidity?.readAttributes(['measuredValue'])
          .catch(err => this.log('Humidity read failed (ignorable):', err.message))
      );
    }

    // Illuminance
    if (this.hasCapability('measure_luminance')) {
      promises.push(
        // TODO: Wrap in try/catch
        this.zclNode.endpoints[1]?.clusters.illuminanceMeasurement?.readAttributes(['measuredValue'])
          .catch(err => this.log('Illuminance read failed (ignorable):', err.message))
      );
    }

    // Alarm status (IAS Zone)
    if (this.hasCapability('alarm_motion') || this.hasCapability('alarm_contact')) {
      promises.push(
        // TODO: Wrap in try/catch
        this.zclNode.endpoints[1]?.clusters.iasZone?.readAttributes(['zoneStatus'])
          .catch(err => this.log('IAS Zone read failed (ignorable):', err.message))
      );
    }

    try {
      await Promise.allSettled(promises).catch(err => this.error(err));
    } catch (err) { this.error('Await error:', err); }
    this.log('[OK] Poll attributes completed');
  }



  /**
   * Read attribute with intelligent fallback
   * Tries multiple strategies until success
   */
  async readAttributeSafe(cluster, attribute) {
    try {
      return await this.fallback.readAttributeWithFallback(cluster, attribute).catch(err => this.error(err));
    } catch (err) {
      this.error(`Failed to read ${cluster}.${attribute} after all fallback strategies:`, err);
      throw err;
    }
  }

  /**
   * Configure report with intelligent fallback
   */
  async configureReportSafe(config) {
    try {
      return await this.fallback.configureReportWithFallback(config).catch(err => this.error(err));
    } catch (err) {
      this.error(`Failed to configure report after all fallback strategies:`, err);
      // Don't throw - use polling as ultimate fallback
      return { success: false, method: 'polling' };
    }
  }

  /**
   * IAS Zone enrollment with fallback
   */
  async enrollIASZoneSafe() {
    try {
      return await this.fallback.iasEnrollWithFallback().catch(err => this.error(err));
    } catch (err) {
      this.error('Failed to enroll IAS Zone after all fallback strategies:', err);
      throw err;
    }
  }

  /**
   * Get fallback system statistics
   */
  getFallbackStats() {
    return this.fallback ? this.fallback.getStats() : null;
  }

  /**
   * Setup IAS Zone (SDK3 Compliant)
   */
  async setupIASZone() {
    this.log('🔐 Setting up IAS Zone...');

    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters?.iasZone) {
      this.log('[INFO] IAS Zone cluster not available');
      return;
    }

    try {
      // Setup Zone Enroll Request listener
      endpoint.clusters.iasZone.onZoneEnrollRequest = async () => {
        this.log('[MSG] Zone Enroll Request received');
        try {
          await endpoint.clusters.iasZone.zoneEnrollResponse({
            enrollResponseCode: 0,
            zoneId: 10
          });
          this.log('[OK] Zone Enroll Response sent');
        } catch (err) {
          this.error('Zone Enroll Response failed:', err.message);
        }
      };

      // Send proactive enrollment response
      await endpoint.clusters.iasZone.zoneEnrollResponse({
        enrollResponseCode: 0,
        zoneId: 10
      });
      this.log('[OK] Proactive enrollment sent');

      // Setup status change listener
      endpoint.clusters.iasZone.onZoneStatusChangeNotification = async (payload) => {
        if (payload?.zoneStatus !== undefined) {
          let status = payload.zoneStatus;
          if (typeof status.valueOf === 'function') {
            status = status.valueOf();
          }
          const alarm = (status & 0x01) !== 0;
          await this.setCapabilityValue('alarm_contact', alarm).catch(this.error);
          this.log(`[STATUS] Alarm: ${alarm ? 'TRIGGERED' : 'cleared'}`);
        }
      };

      this.log('[OK] IAS Zone configured');
    } catch (err) {
      this.error('IAS Zone setup failed:', err);
    }
  }
}

module.exports = SmartDoorbellBatteryDevice;


module.exports = SmartDoorbellBatteryDevice;
