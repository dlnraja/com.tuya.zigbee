'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * PresenceSensorRadarDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class PresenceSensorRadarDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    try {
      // Sanity checks
      if (!zclNode) {
        this.log('[ERROR] onNodeInit: missing zclNode');
        return;
      }

      this.log('PresenceSensorRadarDevice initializing...');
      
      // Critical: Attribute reporting for data transmission
      await super.onNodeInit({ zclNode }).catch(err => this.error(err));
      
      // THEN setup (zclNode now exists)
      await this.setupAttributeReporting();

      // Setup IAS Zone (SDK3 - based on Peter's success patterns)
      await this.setupIASZone();

      // Setup sensor capabilities (SDK3)
      await this.registerLuminanceCapability();
      
      // Safe set available
      if (typeof this._safeResolveAvailable === 'function') {
        this._safeResolveAvailable(true);
      } else if (typeof this.setAvailable === 'function') {
        this.setAvailable();
      }
      
      this.log('PresenceSensorRadarDevice initialized - Power source:', this.powerSource || 'unknown');
    } catch (err) {
      this.log('[ERROR] onNodeInit outer catch:', err);
      if (typeof this._safeRejectAvailable === 'function') {
        this._safeRejectAvailable(err);
      }
    }
  }

  
  /**
   * Setup IAS Zone for Motion detection (SDK3 Compliant)
   * 
   * Based on Peter's successful diagnostic patterns:
   * - Temperature/Humidity/Lux work via standard clusters [OK]
   * - IAS Zone requires special SDK3 enrollment method
   * 
   * Cluster 1280 (IASZone) - Motion/Alarm detection
   */
  /**
   * Setup IAS Zone (SDK3 - Based on IASZoneEnroller_SIMPLE_v4.0.6.js)
   * Version la plus récente du projet (2025-10-21)
   */
  async setupIASZone() {
    this.log('🔐 Setting up IAS Zone (SDK3 latest method)...');
    
    const endpoint = this.zclNode.endpoints[1];
    
    if (!endpoint?.clusters?.iasZone) {
      this.log('[INFO]  IAS Zone cluster not available');
      return;
    }
    
    try {
      // Step 1: Setup Zone Enroll Request listener (SYNCHRONOUS - property assignment)
      // SDK3: Use property assignment, NOT .on() event listener
      endpoint.clusters.iasZone.onZoneEnrollRequest = async () => {
        this.log('[MSG] Zone Enroll Request received');
        
        try {
          // Send response IMMEDIATELY
          await endpoint.clusters.iasZone.zoneEnrollResponse({
            enrollResponseCode: 0, // 0 = Success
            zoneId: 10
          });
          
          this.log('[OK] Zone Enroll Response sent (zoneId: 10)');
        } catch (err) {
          this.error('Failed to send Zone Enroll Response:', err.message);
        }
      };
      
      this.log('[OK] Zone Enroll Request listener configured');
      
      // Step 2: Send proactive Zone Enroll Response (SDK3 official method)
      // Per Homey docs: "driver could send Zone Enroll Response when initializing
      // regardless of having received Zone Enroll Request"
      this.log('[SEND] Sending proactive Zone Enroll Response...');
      
      try {
        await endpoint.clusters.iasZone.zoneEnrollResponse({
          enrollResponseCode: 0,
          zoneId: 10
        });
        
        this.log('[OK] Proactive Zone Enroll Response sent');
      } catch (err) {
        this.log('[WARN]  Proactive response failed (normal if device not ready):', err.message);
      }
      
      // Step 3: Setup Zone Status Change listener (property assignment)
      // SDK3: Use .onZoneStatusChangeNotification property, NOT .on() event
      endpoint.clusters.iasZone.onZoneStatusChangeNotification = (payload) => {
        this.log('[MSG] Zone notification received:', payload);
        
        if (payload && payload.zoneStatus !== undefined) {
          // Convert Bitmap to value if needed
          let status = payload.zoneStatus;
          if (status && typeof status.valueOf === 'function') {
            status = status.valueOf();
          }
          
          // Check alarm1 bit (motion/alarm detected)
          const alarm = (status & 0x01) !== 0;
          
          this.setCapabilityValue('alarm_motion', alarm).catch(this.error);
          this.log(`${alarm ? '[ALARM]' : '[OK]'} Alarm: ${alarm ? 'TRIGGERED' : 'cleared'}`);
        }
      };
      
      this.log('[OK] Zone Status listener configured');
      
      // Step 4: Setup Zone Status attribute listener (property assignment)
      // Alternative listener for attribute reports
      endpoint.clusters.iasZone.onZoneStatus = async (zoneStatus) => {
        this.log('[DATA] Zone attribute report:', zoneStatus);
        
        let status = zoneStatus;
        if (status && typeof status.valueOf === 'function') {
          status = status.valueOf();
        }
        
        const alarm = (status & 0x01) !== 0;
        await this.setCapabilityValue('alarm_motion', alarm).catch(this.error);
      };
      
      this.log('[OK] IAS Zone configured successfully (SDK3 latest method)');
      
    } catch (err) {
      this.error('IAS Zone setup failed:', err);
    }
  }

  async onDeleted() {
    this.log('PresenceSensorRadarDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
  /**
   * Setup Attribute Reporting for Presence Sensor
   * Temperature, Humidity, Battery, Illuminance, Motion
   */
  async setupAttributeReporting() {
    try {
      this.log('[DATA] Setting up attribute reporting...');
      
      const endpoint = this.zclNode.endpoints[1];
      
      // Setup cluster listeners FIRST (before configureAttributeReporting)
      
      // Temperature listener (cluster 1026)
      if (endpoint?.clusters?.msTemperatureMeasurement) {
        endpoint.clusters.msTemperatureMeasurement.on('attr.measuredValue', async (value) => {
          const temperature = value / 100;
          this.log('[TEMP] Temperature:', temperature);
          await this.setCapabilityValue('measure_temperature', temperature).catch(this.error);
        });
      }
      
      // Humidity listener (cluster 1029)
      if (endpoint?.clusters?.msRelativeHumidity) {
        endpoint.clusters.msRelativeHumidity.on('attr.measuredValue', async (value) => {
          const humidity = value / 100;
          this.log('[HUMID] Humidity:', humidity);
          await this.setCapabilityValue('measure_humidity', humidity).catch(this.error);
        });
      }
      
      // Battery listener (cluster 1)
      if (endpoint?.clusters?.genPowerCfg) {
        endpoint.clusters.genPowerCfg.on('attr.batteryPercentageRemaining', async (value) => {
          const battery = value / 2;
          this.log('[BATTERY] Battery:', battery, '%');
          await this.setCapabilityValue('measure_battery', battery).catch(this.error);
        });
      }
      
      // Illuminance listener (cluster 1024)
      if (endpoint?.clusters?.msIlluminanceMeasurement) {
        endpoint.clusters.msIlluminanceMeasurement.on('attr.measuredValue', async (value) => {
          const lux = Math.pow(10, (value - 1) / 10000);
          this.log('[BULB] Illuminance:', lux, 'lux');
          await this.setCapabilityValue('measure_luminance', lux).catch(this.error);
        });
      }
      
      // Motion detection via IAS Zone (cluster 1280)
      if (endpoint?.clusters?.iasZone) {
        // Enroll IAS Zone first - use ZigbeeHelpers for robust IEEE address retrieval
        try {
          const ieeeAddress = await this.getIeeeAddress();
          if (ieeeAddress) {
            await endpoint.clusters.iasZone.writeAttributes({
              iasCieAddr: ieeeAddress
            }).catch(err => this.log('IAS enrollment (non-critical):', err.message));
            this.log('[OK] IAS Zone enrolled with IEEE:', ieeeAddress);
          } else {
            this.log('[WARN]  IAS enrollment skipped: IEEE address not available');
          }
        } catch (err) {
          this.log('IAS enrollment error:', err.message);
        }
        
        // Zone notifications (motion detection)
        endpoint.clusters.iasZone.onZoneStatusChangeNotification = async (data) => {
          this.log('🚶 Motion detected:', data);
          const motion = !!(data.zoneStatus & 1);
          await this.setCapabilityValue('alarm_motion', motion).catch(this.error);
        };
        
        // Attribute listener (backup)
        endpoint.clusters.iasZone.onZoneStatus = async (value) => {
          this.log('🚶 Motion status:', value);
          const motion = !!(value & 1);
          await this.setCapabilityValue('alarm_motion', motion).catch(this.error);
        };
      }
      
      // Configure reporting intervals (numbers only)
      await this.configureAttributeReporting([
        { endpointId: 1, cluster: 1026, attributeName: 'measuredValue', minInterval: 60, maxInterval: 3600, minChange: 50 },
        { endpointId: 1, cluster: 1029, attributeName: 'measuredValue', minInterval: 60, maxInterval: 3600, minChange: 50 },
        { endpointId: 1, cluster: 1, attributeName: 'batteryPercentageRemaining', minInterval: 3600, maxInterval: 43200, minChange: 2 },
        { endpointId: 1, cluster: 1024, attributeName: 'measuredValue', minInterval: 60, maxInterval: 3600, minChange: 100 }
      ]).catch(err => this.log('Configure reporting (non-critical):', err.message));
      
      this.log('[OK] Attribute reporting configured');
      
    } catch (err) {
      this.error('Attribute reporting setup failed:', err);
    }
  }

}

module.exports = PresenceSensorRadarDevice;
