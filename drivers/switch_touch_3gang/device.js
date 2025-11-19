'use strict';

const SwitchDevice = require('../../lib/devices/SwitchDevice');

/**
 * SwitchTouch3GangDevice - Unified 3-gang touch switch
 * Auto-detects AC/DC power source
 * Handles 3 independent switches
 */
class SwitchTouch3GangDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('SwitchTouch3GangDevice initializing...');

    // Set switch count for this device
    this.switchCount = 3;
    this.switchType = 'touch';

    // Initialize base (power detection + switch control)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    this.log('SwitchTouch3GangDevice initialized - 3 switches ready');
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
    //     });

    // Additional switches (endpoints 2-3)
    /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('onoff.switch_2', 6,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'onoff.switch_2', Cluster: 6
*/
    // this.registerCapability('onoff.switch_2', 6, {
    //       endpoint: 2
    //   });
    /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('onoff.switch_3', 6,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'onoff.switch_3', Cluster: 6
  */
    // this.registerCapability('onoff.switch_3', 6, {
    //       endpoint: 3
    //   });
  }

  async onDeleted() {
    this.log('SwitchTouch3GangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = SwitchTouch3GangDevice;
