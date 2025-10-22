'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * SwitchTouch3GangDevice - Unified 3-gang touch switch
 * Auto-detects AC/DC power source
 * Handles 3 independent switches
 */
class SwitchTouch3GangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('SwitchTouch3GangDevice initializing...');
    
    // Set switch count for this device
    this.switchCount = 3;
    this.switchType = 'touch';
    
    // Initialize base (power detection + switch control)
    await super.onNodeInit();
    
    this.log('SwitchTouch3GangDevice initialized - 3 switches ready');
  }

  /**
   * Register capabilities for 3 switches
   */
  async registerSwitchCapabilities() {
    // Main switch (endpoint 1)
    this.registerCapability('onoff', this.CLUSTER.ON_OFF, {
      endpoint: 1
    });
    
    // Additional switches (endpoints 2-3)
    this.registerCapability('onoff.switch_2', this.CLUSTER.ON_OFF, {
      endpoint: 2
    });
    this.registerCapability('onoff.switch_3', this.CLUSTER.ON_OFF, {
      endpoint: 3
    });
  }

  async onDeleted() {
    this.log('SwitchTouch3GangDevice deleted');
    await super.onDeleted();
  }
}

module.exports = SwitchTouch3GangDevice;
