'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * WaterValveDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class WaterValveDevice extends BaseHybridDevice {

  async onNodeInit() {
    this.log('WaterValveDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));

    // Setup IAS Zone (SDK3 - based on Peter's success patterns)
    await this.setupIASZone();

    // Setup sensor capabilities (SDK3)
    await this.setupTemperatureSensor();
    
    this.log('WaterValveDevice initialized - Power source:', this.powerSource || 'unknown');
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
   * Setup IAS Zone for Motion detection (SDK3 Compliant)
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
        await this.setCapabilityValue('alarm_motion', alarm).catch(this.error);
        
        this.log(`${alarm ? '🚨' : '✅'} Motion detection: ${alarm ? 'TRIGGERED' : 'cleared'}`);
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

  async onDeleted() {
    this.log('WaterValveDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = WaterValveDevice;
