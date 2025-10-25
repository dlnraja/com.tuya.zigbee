'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * SwitchWall1GangDevice - Unified 1-gang wall switch
 * Auto-detects AC/DC power source
 * Handles 1 independent switch
 */
class SwitchWall1GangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('SwitchWall1GangDevice initializing...');
    
    // Set switch count for this device
    this.switchCount = 1;
    this.switchType = 'wall';
    
    // Initialize base (power detection + switch control)
    await super.onNodeInit().catch(err => this.error(err));
    
    this.log('SwitchWall1GangDevice initialized - 1 switch ready');
  }

  /**
   * Register capabilities for 1 switches
   */
  }
  async registerSwitchCapabilities() {
    // Main switch (endpoint 1)
    this.registerCapability('onoff', 6, {
      endpoint: 1
    });
    
    
  }

  async onDeleted() {
    this.log('SwitchWall1GangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = SwitchWall1GangDevice;
