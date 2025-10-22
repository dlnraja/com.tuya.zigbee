'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * SwitchWall4GangDevice - Unified 4-gang wall switch
 * Auto-detects AC/DC power source
 * Handles 4 independent switches
 */
class SwitchWall4GangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('SwitchWall4GangDevice initializing...');
    
    // Set switch count for this device
    this.switchCount = 4;
    this.switchType = 'wall';
    
    // Initialize base (power detection + switch control)
    await super.onNodeInit();
    
    this.log('SwitchWall4GangDevice initialized - 4 switches ready');
  }

  /**
   * Register capabilities for 4 switches
   */
  async registerSwitchCapabilities() {
    // Main switch (endpoint 1)
    this.registerCapability('onoff', this.CLUSTER.ON_OFF, {
      endpoint: 1
    });
    
    // Additional switches (endpoints 2-4)
    this.registerCapability('onoff.switch_2', this.CLUSTER.ON_OFF, {
      endpoint: 2
    });
    this.registerCapability('onoff.switch_3', this.CLUSTER.ON_OFF, {
      endpoint: 3
    });
    this.registerCapability('onoff.switch_4', this.CLUSTER.ON_OFF, {
      endpoint: 4
    });
  }

  async onDeleted() {
    this.log('SwitchWall4GangDevice deleted');
    await super.onDeleted();
  }
}

module.exports = SwitchWall4GangDevice;
