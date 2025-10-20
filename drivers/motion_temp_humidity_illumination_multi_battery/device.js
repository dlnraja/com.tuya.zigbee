'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');
const { fromZclBatteryPercentageRemaining } = require('../../lib/tuya-engine/converters/battery');
const { fromZigbeeMeasuredValue } = require('../../lib/tuya-engine/converters/illuminance');
const FallbackSystem = require('../../lib/FallbackSystem');
// Tuya cluster handler removed - using standard Zigbee clusters only

class MotionTempHumidityIlluminationSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {

// IAS Zone Enrollment - Motion Sensor
    const endpoint = this.zclNode.endpoints[1];
    const iasZoneCluster = endpoint.clusters.iasZone;
    
    if (!iasZoneCluster) {
      this.error('IAS Zone cluster not found on endpoint 1');
      return;
    }
    
    // Listen for zone status changes (attribute reports)
    iasZoneCluster.on('attr.zoneStatus', (value) => {
      const alarmActive = (value & 0x01) === 0x01; // Bit 0 = alarm1 (motion)
      this.log('🎯 Motion detected (attr):', alarmActive);
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
    
    // CRITICAL: Listen for zone status change notifications (command-based)
    // Some devices send commands instead of attribute reports
    iasZoneCluster.on('zoneStatusChangeNotification', async (payload) => {
      this.log('📨 Motion notification received:', payload);
      const alarmActive = (payload.zoneStatus & 0x01) === 0x01;
      this.log('🎯 Motion detected (notification):', alarmActive);
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
      // Get IEEE address from zclNode (SDK3 compatible)
      const ieeeAddress = this.zclNode.ieeeAddress;
      if (ieeeAddress) {
        await iasZoneCluster.writeAttributes({
          iasCieAddr: ieeeAddress
        });
        this.log('Wrote IAS CIE address:', ieeeAddress);
      } else {
        this.error('IEEE address not available');
      }
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
        cluster: CLUSTER.POWER_CONFIGURATION,  // SDK3: Use CLUSTER constant
        attributeName: 'batteryPercentageRemaining',
        minInterval: 3600,
        maxInterval: 65535,  // MAX uint16 (18.2h) - was 86400 (24h) causing range error
        minChange: 2  // FIXED: Minimum 2 for battery (0-200 scale)
      }]);
      this.log('Battery reporting configured');
    } catch (err) {
      this.log('Battery report config failed (non-critical):', err.message);
    }
    
    // Battery capability will be registered later with other sensors (line ~207)
    // REMOVED duplicate registration here to fix "expected_cluster_id_number" error
    
    // REMOVED registerPollInterval - doesn't exist in SDK3
    // Battery will report via configureAttributeReporting above
    // Force initial read après pairing (résout données non visibles)
    setTimeout(() => {
      this.pollAttributes().catch(err => this.error('Initial poll failed:', err));
    }, 5000);

    // REMOVED registerPollInterval - doesn't exist in SDK3
    // Sensors will report via configureAttributeReporting
  
    this.log('motion_temp_humidity_illumination_sensor device initialized');
    
    this.log('=== DEVICE DEBUG INFO ===');
    this.log('Node:', zclNode ? 'available' : 'undefined');
    this.log('Endpoints:', Object.keys(zclNode?.endpoints || {}));
    
    const debugEndpoint = zclNode.endpoints[1];
    if (debugEndpoint) {
      const clusters = Object.keys(debugEndpoint.clusters || {}).map(c => {
        const cluster = debugEndpoint.clusters[c];
        return `${c} (0x${cluster?.id?.toString(16) || 'NaN'})`;
      }).join(', ');
      this.log('Endpoint 1 clusters:', clusters);
    }
    this.log('========================');

    // Register standard Zigbee clusters
    this.log('Registering standard Zigbee clusters...');
      
      // Temperature (cluster 1026)
      this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
        get: 'measuredValue',
        report: 'measuredValue',
        getOpts: {
          getOnStart: true
        },
        reportParser: value => {
          this.log('Temperature:', value / 100);
          return value / 100;
        }
      });
      this.log('✅ Temperature cluster registered');
      
      // Humidity (cluster 1029)
      this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT, {
        get: 'measuredValue',
        report: 'measuredValue',
        getOpts: {
          getOnStart: true
        },
        reportParser: value => {
          this.log('Humidity:', value / 100);
          return value / 100;
        }
      });
      this.log('✅ Humidity cluster registered');
      
      // Illuminance (cluster 1024)
      this.registerCapability('measure_luminance', CLUSTER.ILLUMINANCE_MEASUREMENT, {
        get: 'measuredValue',
        report: 'measuredValue',
        getOpts: {
          getOnStart: true
        },
        reportParser: value => {
          this.log('Illuminance:', fromZigbeeMeasuredValue(value));
          return fromZigbeeMeasuredValue(value);
        }
      });
      this.log('✅ Illuminance cluster registered');
      
      // Motion IAS Zone
      this.log('🚶 Setting up Motion IAS Zone...');
      try {
        const iasEndpoint = zclNode.endpoints[1];
        const enroller = new IASZoneEnroller(this, iasEndpoint, {
          zoneType: 13, // Motion sensor
          capability: 'alarm_motion',
          pollInterval: 60000,
          autoResetTimeout: 60000 // Auto-reset after 60s
        });
        const method = await enroller.enroll(zclNode);
        this.log(`✅ Motion IAS Zone enrolled via: ${method}`);
      } catch (err) {
        this.error('IAS Zone enrollment failed:', err);
        this.log('⚠️ Device may auto-enroll or work without explicit enrollment');
      }
      
      // Battery
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        getOpts: {
          getOnStart: true
        },
        reportParser: value => {
          this.log('Battery raw value:', value);
          return fromZclBatteryPercentageRemaining(value);
        }
      });
      this.log('✅ Battery capability registered');

    this.setAvailable().catch(err => this.error('setAvailable error:', err));
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

module.exports = MotionTempHumidityIlluminationSensorDevice;
