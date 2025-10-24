'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * SwitchWall3GangDevice - Unified 3-gang wall switch
 * Auto-detects AC/DC power source
 * Handles 3 independent switches
 */
class SwitchWall3GangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('SwitchWall3GangDevice initializing...');
    
    // Set switch count for this device
    this.switchCount = 3;
    this.switchType = 'wall';
    
    // Initialize base (power detection + switch control)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('SwitchWall3GangDevice initialized - 3 switches ready');
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
    this.log('SwitchWall3GangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = SwitchWall3GangDevice;
