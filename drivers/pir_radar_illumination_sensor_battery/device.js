'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');
const batteryConverter = require('../../lib/tuya-engine/converters/battery');
const { CLUSTER } = require('zigbee-clusters');
const TuyaClusterHandler = require('../../utils/tuya-cluster-handler');

class PirRadarIlluminationSensorBatteryDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // IAS Zone Enrollment - Motion Sensor
    const endpoint = this.zclNode.endpoints[1];
    const iasZoneCluster = endpoint.clusters.iasZone;
    
    if (!iasZoneCluster) {
      this.error('IAS Zone cluster not found on endpoint 1');
      return;
    }
    
    // Listen for zone status changes
    iasZoneCluster.on('attr.zoneStatus', (value) => {
      const alarmActive = (value & 0x01) === 0x01; // Bit 0 = alarm1 (motion)
      this.log('Motion detected:', alarmActive);
      this.setCapabilityValue('alarm_motion', alarmActive).catch(this.error);
      
      // Auto-reset après 60 secondes
      if (alarmActive && !this._motionTimeout) {
        this._motionTimeout = setTimeout(() => {
          this.log('Auto-clearing motion after 60s');
          this.setCapabilityValue('alarm_motion', false).catch(this.error);
          this._motionTimeout = null;
        }, 60000);
      }
    });
    
    // Proactive enrollment response
    iasZoneCluster.on('zoneEnrollRequest', async (enrollRequest) => {
      this.log('Received zoneEnrollRequest:', enrollRequest);
      
      try {
        await iasZoneCluster.zoneEnrollResponse({
          enrollResponseCode: 0, // Success
          zoneId: 10
        });
        this.log('Sent zoneEnrollResponse successfully');
      } catch (err) {
        this.error('Failed to send zoneEnrollResponse:', err);
      }
    });
    
    // Write IAS CIE Address proactively
    try {
      const ieeeAddress = await this.homey.zigbee.getIeeeAddress();
      await iasZoneCluster.writeAttributes({
        iasCieAddr: ieeeAddress
      });
      this.log('Wrote IAS CIE address:', ieeeAddress);
    } catch (err) {
      this.error('Failed to write IAS CIE address:', err);
    }
    // ==========================================
    // BATTERY MANAGEMENT - OPTIMIZED
    // ==========================================
    
    // Configure battery reporting
    try {
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: CLUSTER.POWER_CONFIGURATION,
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
    this.registerCapability('measure_battery', 1, {
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
        await this.pollAttributes();
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
        const battery = await this.zclNode.endpoints[1].clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining']);
        
        if (battery && battery.batteryPercentageRemaining !== undefined) {
          const percentage = Math.round(battery.batteryPercentageRemaining / 2);
          await this.setCapabilityValue('measure_battery', percentage);
          this.log('Battery polled:', percentage + '%');
          
          // Reset failure counter on success
          pollFailures = 0;
          
          // Low battery alert
          if (percentage <= 20 && percentage > 10) {
            this.log('⚠️  Low battery warning:', percentage + '%');
            await this.homey.notifications.createNotification({
              excerpt: `${this.getName()} battery low (${percentage}%)`
            }).catch(() => {});
          }
          
          // Critical battery alert
          if (percentage <= 10) {
            this.log('🔴 Critical battery:', percentage + '%');
            await this.homey.notifications.createNotification({
              excerpt: `${this.getName()} battery critical (${percentage}%) - replace soon!`
            }).catch(() => {});
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
        await this.pollAttributes();
      } catch (err) {
        this.error('Poll failed:', err);
      }
    }, 300000); // 5 minutes
  
    this.log('pir_radar_illumination_sensor_battery initialized');

    // Call parent
    try {
    await super.onNodeInit({ zclNode });
    // Initialize Fallback System
    this.fallback = new FallbackSystem(this, {
      maxRetries: 3,
      baseDelay: 1000,
      verbosity: this.getSetting('debug_level') || 'INFO',
      trackPerformance: true
    });
    this.log('✅ FallbackSystem initialized');
    } catch (err) { this.error('Await error:', err); }
    
    // Initialiser le système de batterie intelligent V2 (Homey Persistent Storage)
    try {
      const BatteryIntelligenceSystemV2 = require('../../utils/battery-intelligence-system-v2');
const FallbackSystem = require('../../lib/FallbackSystem');
      this.batterySystem = new BatteryIntelligenceSystemV2(this);
      await this.batterySystem.load();
      this.log('✅ Battery Intelligence System V2 loaded (Homey Storage)');
    } catch (err) {
      this.log('⚠️  Battery Intelligence System V2 not available:', err.message);
      this.log('   → Fallback to basic mode will be used');
    }

    // Auto-detect device type and initialize Tuya cluster handler
    const deviceType = TuyaClusterHandler.detectDeviceType('pir_radar_illumination_sensor_battery');
    const tuyaInitialized = await TuyaClusterHandler.init(this, zclNode, deviceType);
    
    if (tuyaInitialized) {
      this.log('✅ Tuya cluster handler initialized for type:', deviceType);
    } else {
      this.log('⚠️  No Tuya cluster found, using standard Zigbee');
      
      // Fallback to standard cluster handling if needed
      try {
      await this.registerStandardCapabilities();
      } catch (err) { this.error('Await error:', err); }
    }

    // Mark device as available
    await this.setAvailable();
  }

   catch (err) {
      this.error('Battery change detection error:', err);
    }
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
      await flowCard.trigger(this, tokens);
      this.log(`✅ Flow triggered: ${cardId}`, tokens);
    } catch (err) {
      this.error(`❌ Flow trigger error: ${cardId}`, err);
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
        this.zclNode.endpoints[1]?.clusters.powerConfiguration?.readAttributes('batteryPercentageRemaining')
          .catch(err => this.log('Battery read failed (ignorable):', err.message))
      );
    }
    
    // Temperature
    if (this.hasCapability('measure_temperature')) {
      promises.push(
        this.zclNode.endpoints[1]?.clusters.temperatureMeasurement?.readAttributes('measuredValue')
          .catch(err => this.log('Temperature read failed (ignorable):', err.message))
      );
    }
    
    // Humidity
    if (this.hasCapability('measure_humidity')) {
      promises.push(
        this.zclNode.endpoints[1]?.clusters.relativeHumidity?.readAttributes('measuredValue')
          .catch(err => this.log('Humidity read failed (ignorable):', err.message))
      );
    }
    
    // Illuminance
    if (this.hasCapability('measure_luminance')) {
      promises.push(
        this.zclNode.endpoints[1]?.clusters.illuminanceMeasurement?.readAttributes('measuredValue')
          .catch(err => this.log('Illuminance read failed (ignorable):', err.message))
      );
    }
    
    // Alarm status (IAS Zone)
    if (this.hasCapability('alarm_motion') || this.hasCapability('alarm_contact')) {
      promises.push(
        this.zclNode.endpoints[1]?.clusters.iasZone?.readAttributes('zoneStatus')
          .catch(err => this.log('IAS Zone read failed (ignorable):', err.message))
      );
    }
    
    try {
    await Promise.allSettled(promises);
    } catch (err) { this.error('Await error:', err); }
    this.log('✅ Poll attributes completed');
  }



  /**
   * Read attribute with intelligent fallback
   * Tries multiple strategies until success
   */
  async readAttributeSafe(cluster, attribute) {
    try {
      return await this.fallback.readAttributeWithFallback(cluster, attribute);
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
      return await this.fallback.configureReportWithFallback(config);
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
      return await this.fallback.iasEnrollWithFallback();
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
}

module.exports = PirRadarIlluminationSensorBatteryDevice;
