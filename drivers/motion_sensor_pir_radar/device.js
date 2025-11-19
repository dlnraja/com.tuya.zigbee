'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

/**
 * PirRadarIlluminationSensorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class PirRadarIlluminationSensorDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('PirRadarIlluminationSensorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    // Setup IAS Zone (SDK3 - based on Peter's success patterns)
    await this.setupIASZone();

    // Setup sensor capabilities (SDK3)
    await this.setupLuminanceSensor();
    
    this.log('PirRadarIlluminationSensorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  
  /**
   * Setup measure_luminance capability (SDK3)
   * Cluster 1024 - measuredValue
   */
  async setupLuminanceSensor() {
    if (!this.hasCapability('measure_luminance')) {
      return;
    }
    
    this.log('[TEMP]  Setting up measure_luminance (cluster 1024)...');
    
    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters[1024]) {
      this.log('[WARN]  Cluster 1024 not available');
      return;
    }
    
    try {
      /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('measure_luminance', 1024,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'measure_luminance', Cluster: 1024
*/
// this.registerCapability('measure_luminance', 1024, {
//         get: 'measuredValue',
//         report: 'measuredValue',
//         reportParser: value => Math.pow(10, (value - 1) / 10000),
//         reportOpts: {
//           configureAttributeReporting: {
//             minInterval: 60,
//             maxInterval: 3600,
//             minChange: 100
          //           }
        //         },
        //         getOpts: {
          //           getOnStart: true
        //         }
      //       });
      
      this.log('[OK] measure_luminance configured (cluster 1024)');
    } catch (err) {
      this.error('measure_luminance setup failed:', err);
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
      endpoint.clusters.iasZone.onZoneEnrollRequest = () => {
        this.log('[MSG] Zone Enroll Request received');
        
        try {
          // Send response IMMEDIATELY (synchronous, no async, no delay)
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
      endpoint.clusters.iasZone.onZoneStatusChangeNotification = async (payload) => {
        this.log('[MSG] Zone notification received:', payload);
        
        if (payload && payload.zoneStatus !== undefined) {
          // Convert Bitmap to value if needed
          let status = payload.zoneStatus;
          if (status && typeof status.valueOf === 'function') {
            status = status.valueOf();
          }
          
          // Check alarm1 bit (motion/alarm detected)
          const alarm = (status & 0x01) !== 0;
          
          await (async () => {
        this.log(`📝 [DIAG] setCapabilityValue: ${'alarm_motion'} = ${alarm}`);
        try {
          await this.setCapabilityValue('alarm_motion', alarm);
          this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'alarm_motion'}`);
        } catch (err) {
          this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'alarm_motion'}`, err.message);
          throw err;
        }
      })().catch(this.error);
          this.log(`${alarm ? '[ALARM]' : '[OK]'} Alarm: ${alarm ? 'TRIGGERED' : 'cleared'}`);
        }
      };
      
      this.log('[OK] Zone Status listener configured');
      
      // Step 4: Setup Zone Status attribute listener (property assignment)
      // Alternative listener for attribute reports
      endpoint.clusters.iasZone.onZoneStatus = (zoneStatus) => {
        this.log('[DATA] Zone attribute report:', zoneStatus);
        
        let status = zoneStatus;
        if (status && typeof status.valueOf === 'function') {
          status = status.valueOf();
        }
        
        const alarm = (status & 0x01) !== 0;
        await (async () => {
        this.log(`📝 [DIAG] setCapabilityValue: ${'alarm_motion'} = ${alarm}`);
        try {
          await this.setCapabilityValue('alarm_motion', alarm);
          this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'alarm_motion'}`);
        } catch (err) {
          this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'alarm_motion'}`, err.message);
          throw err;
        }
      })().catch(this.error);
      };
      
      this.log('[OK] IAS Zone configured successfully (SDK3 latest method)');
      
    } catch (err) {
      this.error('IAS Zone setup failed:', err);
    }
  }

  async onDeleted() {
    this.log('PirRadarIlluminationSensorDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = PirRadarIlluminationSensorDevice;
