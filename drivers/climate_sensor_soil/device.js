'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * TuyaSoilTesterTempHumidDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class TuyaSoilTesterTempHumidDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('TuyaSoilTesterTempHumidDevice initializing...');
    
    // Setup sensor reporting
    await this.setupSensorReporting();
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));

    // Setup IAS Zone (SDK3 - based on Peter's success patterns)
    await this.setupIASZone();

    // Setup sensor capabilities (SDK3)
    await this.setupTemperatureSensor();
    await this.setupHumiditySensor();
    
    this.log('TuyaSoilTesterTempHumidDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async setupSensorReporting() {
    try {
      const endpoint = this.zclNode.endpoints[1];
      
      if (endpoint?.clusters?.msTemperatureMeasurement) {
        endpoint.clusters.msTemperatureMeasurement.on('attr.measuredValue', async (value) => {
          await this.setCapabilityValue('measure_temperature', value / 100).catch(this.error);
        });
      }
      
      if (endpoint?.clusters?.msRelativeHumidity) {
        endpoint.clusters.msRelativeHumidity.on('attr.measuredValue', async (value) => {
          await this.setCapabilityValue('measure_humidity', value / 100).catch(this.error);
        });
      }
      
      if (endpoint?.clusters?.genPowerCfg) {
        endpoint.clusters.genPowerCfg.on('attr.batteryPercentageRemaining', async (value) => {
          await this.setCapabilityValue('measure_battery', value / 2).catch(this.error);
        });
      }
      
      await this.configureAttributeReporting([
        { endpointId: 1, cluster: 1026, attributeName: 'measuredValue', minInterval: 60, maxInterval: 3600, minChange: 50 },
        { endpointId: 1, cluster: 1029, attributeName: 'measuredValue', minInterval: 60, maxInterval: 3600, minChange: 50 },
        { endpointId: 1, cluster: 1, attributeName: 'batteryPercentageRemaining', minInterval: 3600, maxInterval: 43200, minChange: 2 }
      ]).catch(err => this.log('Reporting config (non-critical):', err.message));
      
    } catch (err) {
      this.error('Sensor reporting setup failed:', err);
    }
  }

  
  /**
   * Setup measure_temperature capability (SDK3)
   * Cluster 1026 - measuredValue
   */
  async setupTemperatureSensor() {
    if (!this.hasCapability('measure_temperature')) {
      return;
    }
    
    this.log('🌡️  Setting up measure_temperature (cluster 1026)...');
    
    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters[1026]) {
      this.log('⚠️  Cluster 1026 not available');
      return;
    }
    
    try {
      this.registerCapability('measure_temperature', 1026, {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value / 100,
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 60,
            maxInterval: 3600,
            minChange: 10
          }
        },
        getOpts: {
          getOnStart: true
        }
      });
      
      this.log('✅ measure_temperature configured (cluster 1026)');
    } catch (err) {
      this.error('measure_temperature setup failed:', err);
    }
  }

  /**
   * Setup measure_humidity capability (SDK3)
   * Cluster 1029 - measuredValue
   */
  async setupHumiditySensor() {
    if (!this.hasCapability('measure_humidity')) {
      return;
    }
    
    this.log('🌡️  Setting up measure_humidity (cluster 1029)...');
    
    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters[1029]) {
      this.log('⚠️  Cluster 1029 not available');
      return;
    }
    
    try {
      this.registerCapability('measure_humidity', 1029, {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value / 100,
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 60,
            maxInterval: 3600,
            minChange: 100
          }
        },
        getOpts: {
          getOnStart: true
        }
      });
      
      this.log('✅ measure_humidity configured (cluster 1029)');
    } catch (err) {
      this.error('measure_humidity setup failed:', err);
    }
  }

  
  /**
   * Setup IAS Zone for Contact sensor (SDK3 Compliant)
   * 
   * Based on Peter's successful diagnostic patterns:
   * - Temperature/Humidity/Lux work via standard clusters ✅
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
      this.log('ℹ️  IAS Zone cluster not available');
      return;
    }
    
    try {
      // Step 1: Setup Zone Enroll Request listener (SYNCHRONOUS - property assignment)
      // SDK3: Use property assignment, NOT .on() event listener
      endpoint.clusters.iasZone.onZoneEnrollRequest = () => {
        this.log('📨 Zone Enroll Request received');
        
        try {
          // Send response IMMEDIATELY (synchronous, no async, no delay)
          endpoint.clusters.iasZone.zoneEnrollResponse({
            enrollResponseCode: 0, // 0 = Success
            zoneId: 10
          });
          
          this.log('✅ Zone Enroll Response sent (zoneId: 10)');
        } catch (err) {
          this.error('Failed to send Zone Enroll Response:', err.message);
        }
      };
      
      this.log('✅ Zone Enroll Request listener configured');
      
      // Step 2: Send proactive Zone Enroll Response (SDK3 official method)
      // Per Homey docs: "driver could send Zone Enroll Response when initializing
      // regardless of having received Zone Enroll Request"
      this.log('📤 Sending proactive Zone Enroll Response...');
      
      try {
        endpoint.clusters.iasZone.zoneEnrollResponse({
          enrollResponseCode: 0,
          zoneId: 10
        });
        
        this.log('✅ Proactive Zone Enroll Response sent');
      } catch (err) {
        this.log('⚠️  Proactive response failed (normal if device not ready):', err.message);
      }
      
      // Step 3: Setup Zone Status Change listener (property assignment)
      // SDK3: Use .onZoneStatusChangeNotification property, NOT .on() event
      endpoint.clusters.iasZone.onZoneStatusChangeNotification = (payload) => {
        this.log('📨 Zone notification received:', payload);
        
        if (payload && payload.zoneStatus !== undefined) {
          // Convert Bitmap to value if needed
          let status = payload.zoneStatus;
          if (status && typeof status.valueOf === 'function') {
            status = status.valueOf();
          }
          
          // Check alarm1 bit (motion/alarm detected)
          const alarm = (status & 0x01) !== 0;
          
          this.setCapabilityValue('alarm_contact', alarm).catch(this.error);
          this.log(`${alarm ? '🚨' : '✅'} Alarm: ${alarm ? 'TRIGGERED' : 'cleared'}`);
        }
      };
      
      this.log('✅ Zone Status listener configured');
      
      // Step 4: Setup Zone Status attribute listener (property assignment)
      // Alternative listener for attribute reports
      endpoint.clusters.iasZone.onZoneStatus = (zoneStatus) => {
        this.log('📊 Zone attribute report:', zoneStatus);
        
        let status = zoneStatus;
        if (status && typeof status.valueOf === 'function') {
          status = status.valueOf();
        }
        
        const alarm = (status & 0x01) !== 0;
        this.setCapabilityValue('alarm_contact', alarm).catch(this.error);
      };
      
      this.log('✅ IAS Zone configured successfully (SDK3 latest method)');
      
    } catch (err) {
      this.error('IAS Zone setup failed:', err);
    }
  }

  async onDeleted() {
    this.log('TuyaSoilTesterTempHumidDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = TuyaSoilTesterTempHumidDevice;
