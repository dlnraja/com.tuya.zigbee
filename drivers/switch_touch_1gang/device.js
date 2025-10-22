'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * SwitchTouch1GangDevice - Unified 1-gang touch switch
 * Auto-detects AC/DC power source
 * Handles 1 independent switch
 */
class SwitchTouch1GangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('SwitchTouch1GangDevice initializing...');
    
    // Set switch count for this device
    this.switchCount = 1;
    this.switchType = 'touch';
    
    // Initialize base (power detection + switch control)
    await super.onNodeInit();
    
    this.log('SwitchTouch1GangDevice initialized - 1 switch ready');
  }

  /**
   * Register capabilities for 1 switches
   */
  async registerSwitchCapabilities() {
    // Main switch (endpoint 1)
    this.registerCapability('onoff', this.CLUSTER.ON_OFF, {
      endpoint: 1
    });
    
    
  }

  async onDeleted() {
    this.log('SwitchTouch1GangDevice deleted');
    await super.onDeleted();
  }
}

module.exports = SwitchTouch1GangDevice;
