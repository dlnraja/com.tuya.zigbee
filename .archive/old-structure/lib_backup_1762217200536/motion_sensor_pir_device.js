'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * MotionSensorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class MotionSensorDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('MotionSensorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    // Setup IAS Zone (SDK3 - based on Peter's success patterns)
    await this.setupIASZone();
    
    this.log('MotionSensorDevice initialized - Power source:', this.powerSource || 'unknown');
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
          
          await this.setCapabilityValue('alarm_motion', alarm).catch(this.error);
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
        await this.setCapabilityValue('alarm_motion', alarm).catch(this.error);
      };
      
      this.log('[OK] IAS Zone configured successfully (SDK3 latest method)');
      
    } catch (err) {
      this.error('IAS Zone setup failed:', err);
    }
  }

  async onDeleted() {
    this.log('MotionSensorDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = MotionSensorDevice;
