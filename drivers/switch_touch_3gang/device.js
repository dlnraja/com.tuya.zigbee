'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * SwitchTouch3GangDevice - Unified 3-gang touch switch
 * Auto-detects AC/DC power source
 * Handles 3 independent switches
 */
class SwitchTouch3GangDevice extends SwitchDevice {

  async onNodeInit() {
    // Time sync (Tuya devices)
    this.setupTimeSync().catch(() => {});

    this.log('SwitchTouch3GangDevice initializing...');
    
    // Set switch count for this device
    this.switchCount = 3;
    this.switchType = 'touch';
    
    // Initialize base (power detection + switch control)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('SwitchTouch3GangDevice initialized - 3 switches ready');
  }

  /**
   * Register capabilities for 3 switches
   */
  }
  async registerSwitchCapabilities() {
    // Main switch (endpoint 1)
    this.registerCapability('onoff', 6, {
      endpoint: 1
    });
    
    // Additional switches (endpoints 2-3)
    this.registerCapability('onoff.switch_2', 6, {
      endpoint: 2
    });
    this.registerCapability('onoff.switch_3', 6, {
      endpoint: 3
    });
  }

  async onDeleted() {
    this.log('SwitchTouch3GangDevice deleted');
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

module.exports = SwitchTouch3GangDevice;
