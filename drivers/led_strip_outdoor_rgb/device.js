'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * LedStripOutdoorColorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class LedStripOutdoorColorDevice extends BaseHybridDevice {

  async onNodeInit() {
    // Setup time synchronization for Tuya device
    await this.setupTimeSync();

    // === AUTO-IMPLEMENTED SENSOR REPORTING ===
    await this.setupSensorReporting();

    this.log('LedStripOutdoorColorDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('LedStripOutdoorColorDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('LedStripOutdoorColorDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
  async setupSensorReporting() {
    try {

      // Contact IAS Zone reporting
      this.registerAttrReportListener(
        'iasZone',
        'zoneStatus',
        1,
        0,
        1,
        value => {
          const contact = !(value & 0x01);
          this.log('Contact:', contact);
          this.setCapabilityValue('alarm_contact', contact).catch(this.error);
        },
        1
      ).catch(err => this.error('Contact reporting failed:', err));
      
      // Zone status notification listener
      if (this.zclNode.endpoints[1]?.clusters?.iasZone) {
        this.zclNode.endpoints[1].clusters.iasZone.on('zoneStatusChangeNotification', (data) => {
          const contact = !(data.zoneStatus & 0x01);
          this.log('Contact notification:', contact);
          this.setCapabilityValue('alarm_contact', contact).catch(this.error);
        });
      }

    } catch (err) {
      this.error('Failed to configure sensor reporting:', err);
    }
  }

  /**
   * Setup Time Synchronization
   * Required for Tuya devices to function properly
   */
  async setupTimeSync() {
    try {
      // Time cluster synchronization
      if (this.zclNode.endpoints[1]?.clusters?.time) {
        this.log('Setting up time synchronization...');
        
        // Calculate Zigbee epoch time (seconds since 2000-01-01 00:00:00 UTC)
        const zigbeeEpochStart = new Date('2000-01-01T00:00:00Z').getTime();
        const currentTime = Date.now();
        const zigbeeTime = Math.floor((currentTime - zigbeeEpochStart) / 1000);
        
        // Write time to device
        await this.zclNode.endpoints[1].clusters.time.writeAttributes({
          time: zigbeeTime,
          timeStatus: {
            master: true,
            synchronized: true,
            masterZoneDst: false,
            superseding: false
          }
        }).catch(err => this.log('Time sync write failed (non-critical):', err.message));
        
        // Setup periodic time sync (every 24 hours)
        this.timeSyncInterval = setInterval(async () => {
          const newZigbeeTime = Math.floor((Date.now() - zigbeeEpochStart) / 1000);
          await this.zclNode.endpoints[1].clusters.time.writeAttributes({
            time: newZigbeeTime
          }).catch(err => this.log('Time resync failed:', err.message));
          this.log('Time resynchronized');
        }, 24 * 60 * 60 * 1000); // 24 hours
        
        this.log('Time synchronization configured');
      }
    } catch (err) {
      this.error('Time sync setup failed (non-critical):', err);
    }
  }
  
  /**
   * Cleanup time sync interval on device removal
   */
  async onDeleted() {
    if (this.timeSyncInterval) {
      clearInterval(this.timeSyncInterval);
    }
    await super.onDeleted?.();
  }

}

module.exports = LedStripOutdoorColorDevice;
