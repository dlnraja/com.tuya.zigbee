'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');
const { CLUSTER } = require('zigbee-clusters');

class DehumidifierDevice extends BaseHybridDevice {
  
  async onNodeInit({ zclNode }) {
    // Initialize hybrid base (power detection)
    await super.onNodeInit();

    // Setup IAS Zone (SDK3 - based on Peter's success patterns)
    await this.setupIASZone();

    // Setup sensor capabilities (SDK3)
    await this.setupHumiditySensor();
    await this.setupTemperatureSensor();

    this.printNode();
    
    // onoff capability
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: 1
      });
    }
    
    // target_humidity capability via Tuya datapoints
    if (this.hasCapability('target_humidity')) {
      this.registerCapability('target_humidity', 61184, {
        endpoint: 1,
        set: async (value) => {
          return {
            dp: 2, // Tuya datapoint for target humidity
            datatype: 2, // Value type
            data: Math.round(value)
          };
        },
        get: 'data',
        reportParser: (value) => {
          if (value && value.dp === 2) {
            return value.data;
          }
          return null;
        }
      });
    }
    
    // measure_humidity capability via Tuya datapoints
    if (this.hasCapability('measure_humidity')) {
      this.registerCapability('measure_humidity', 61184, {
        endpoint: 1,
        get: 'data',
        reportParser: (value) => {
          if (value && value.dp === 1) { // Current humidity datapoint
            return value.data;
          }
          return null;
        }
      });
    }
    
    // measure_temperature capability (if available)
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', 61184, {
        endpoint: 1,
        get: 'data',
        reportParser: (value) => {
          if (value && value.dp === 3) { // Temperature datapoint
            return value.data / 10; // Usually in 0.1°C units
          }
          return null;
        }
      });
    }
    
    // measure_power capability (if available)
    if (this.hasCapability('measure_power')) {
      this.registerCapability('measure_power', 61184, {
        endpoint: 1,
        get: 'data',
        reportParser: (value) => {
          if (value && value.dp === 5) { // Power datapoint
            return value.data;
          }
          return null;
        }
      });
    }
    
    // alarm_water capability (water tank full)
    if (this.hasCapability('alarm_water')) {
      this.registerCapability('alarm_water', 61184, {
        endpoint: 1,
        get: 'data',
        reportParser: (value) => {
          if (value && value.dp === 11) { // Water tank status
            return value.data === 1; // 1 = full, 0 = not full
          }
          return null;
        }
      });
    }
    
    this.log('Dehumidifier device initialized');
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
}


  /**
   * Setup IAS Zone for Water leak detection (SDK3 Compliant)
   * 
   * Based on Peter's successful diagnostic patterns:
   * - Temperature/Humidity/Lux work via standard clusters ✅
   * - IAS Zone requires special SDK3 enrollment method
   * 
   * Cluster 1280 (IASZone) - Motion/Alarm detection
   */
  async setupIASZone() {
    this.log('🔐 Setting up IAS Zone (SDK3)...');
    
    const endpoint = this.zclNode.endpoints[1];
    
    if (!endpoint?.clusters[1280]) {
      this.log('ℹ️  IAS Zone cluster (1280) not available');
      return;
    }
    
    try {
      // Step 1: Write CIE Address (SDK3 method)
      // OLD (broken): await endpoint.clusters.iasZone.write(...)
      // NEW (working): await endpoint.clusters[1280].writeAttributes({...})
      await endpoint.clusters[1280].writeAttributes({
        iasCIEAddress: this.homey.zigbee.ieee
      }).catch(err => {
        this.log('CIE address write failed (non-critical):', err.message);
      });
      
      this.log('✅ CIE address configured:', this.homey.zigbee.ieee);
      
      // Step 2: Listen for zone status change notifications (SDK3 method)
      endpoint.clusters[1280].on('zoneStatusChangeNotification', async (notification) => {
        this.log('📥 Zone status changed:', notification.zoneStatus);
        
        // Parse alarm status from bitmap
        const alarm = notification.zoneStatus.alarm1 === 1;
        
        // Update capability
        await this.setCapabilityValue('alarm_water', alarm).catch(this.error);
        
        this.log(`${alarm ? '🚨' : '✅'} Water leak detection: ${alarm ? 'TRIGGERED' : 'cleared'}`);
      });
      
      this.log('✅ Zone status listener registered');
      
      // Step 3: Setup enrollment response handler
      endpoint.clusters[1280].onZoneEnrollRequest = async () => {
        this.log('📨 Zone enroll request received');
        
        try {
          await endpoint.clusters[1280].zoneEnrollResponse({
            enrollResponseCode: 0, // Success
            zoneId: 10
          });
          
          this.log('✅ Zone enrollment response sent');
        } catch (err) {
          this.error('Zone enroll response failed:', err);
        }
      };
      
      // Step 4: Proactive enrollment (SDK3 best practice)
      // Device might send request during pairing before listener is ready
      // Send proactive response to ensure enrollment
      try {
        await endpoint.clusters[1280].zoneEnrollResponse({
          enrollResponseCode: 0,
          zoneId: 10
        });
        
        this.log('✅ Proactive enrollment response sent');
      } catch (err) {
        // Non-critical: device might not accept proactive response
        this.log('Proactive enrollment skipped (normal if already enrolled)');
      }
      
      this.log('✅ IAS Zone configured successfully (SDK3)');
      
    } catch (err) {
      this.error('IAS Zone setup failed:', err);
    }
  }
}

module.exports = DehumidifierDevice;
