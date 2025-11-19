'use strict';

const SwitchDevice = require('../../lib/devices/SwitchDevice');

/**
 * SwitchTouch1GangDevice - Unified 1-gang touch switch
 * Auto-detects AC/DC power source
 * Handles 1 independent switch
 */
class SwitchTouch1GangDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('SwitchTouch1GangDevice initializing...');
    
    // Set switch count for this device
    this.switchCount = 1;
    this.switchType = 'touch';
    
    // Initialize base (power detection + switch control)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('SwitchTouch1GangDevice initialized - 1 switch ready');
  }

  /**
   * Register capabilities for switches
   */
  async registerSwitchCapabilities() {
    // Main switch (endpoint 1)
    /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('onoff', 6,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'onoff', Cluster: 6
*/
// this.registerCapability('onoff', 6, {
//       endpoint: 1
    });
    
    
  }

  async onDeleted() {
    this.log('SwitchTouch1GangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = SwitchTouch1GangDevice;
