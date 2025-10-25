'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * SwitchWall2GangDevice - Unified 2-gang wall switch
 * Auto-detects AC/DC power source
 * Handles 2 independent switches
 */
class SwitchWall2GangDevice extends SwitchDevice {

  async onNodeInit() {
    // Time sync (Tuya devices)
    this.setupTimeSync().catch(() => {});

    this.log('SwitchWall2GangDevice initializing...');
    
    // Set gang count for this device (used by SwitchDevice base class)
    this.gangCount = 2;
    this.switchType = 'wall';
    
    // Initialize base (power detection + switch control)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('SwitchWall2GangDevice initialized - 2 gangs ready');
  }

  async onDeleted() {
    this.log('SwitchWall2GangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
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

module.exports = SwitchWall2GangDevice;
