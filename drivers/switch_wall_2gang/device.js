'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * SwitchWall2GangDevice - Unified 2-gang wall switch
 * Auto-detects AC/DC power source
 * Handles 2 independent switches
 */
class SwitchWall2GangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('SwitchWall2GangDevice initializing...');
    
    // Set switch count for this device
    this.switchCount = 2;
    this.switchType = 'wall';
    
    // Initialize base (power detection + switch control)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('SwitchWall2GangDevice initialized - 2 switches ready');
  }

  /**
   * Register capabilities for 2 switches
   */
  async registerSwitchCapabilities() {
    // Main switch (endpoint 1)
    this.registerCapability('onoff', this.CLUSTER.ON_OFF, {
      endpoint: 1
    });
    
    // Additional switches (endpoints 2-2)
    this.registerCapability('onoff.switch_2', this.CLUSTER.ON_OFF, {
      endpoint: 2
    });
  }

  async onDeleted() {
    this.log('SwitchWall2GangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = SwitchWall2GangDevice;
