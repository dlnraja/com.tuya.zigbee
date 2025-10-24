'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * SwitchWall6GangDevice - Unified 6-gang wall switch
 * Auto-detects AC/DC power source
 * Handles 6 independent switches
 */
class SwitchWall6GangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('SwitchWall6GangDevice initializing...');
    
    // Set switch count for this device
    this.switchCount = 6;
    this.switchType = 'wall';
    
    // Initialize base (power detection + switch control)
    await super.onNodeInit();
    
    this.log('SwitchWall6GangDevice initialized - 6 switches ready');
  }

  /**
   * Register capabilities for 6 switches
   */
  }
  async registerSwitchCapabilities() {
    // Main switch (endpoint 1)
    this.registerCapability('onoff', this.CLUSTER.ON_OFF, {
      endpoint: 1
    });
    
    // Additional switches (endpoints 2-6)
    this.registerCapability('onoff.switch_2', this.CLUSTER.ON_OFF, {
      endpoint: 2
    });
    this.registerCapability('onoff.switch_3', this.CLUSTER.ON_OFF, {
      endpoint: 3
    });
    this.registerCapability('onoff.switch_4', this.CLUSTER.ON_OFF, {
      endpoint: 4
    });
    this.registerCapability('onoff.switch_5', this.CLUSTER.ON_OFF, {
      endpoint: 5
    });
    this.registerCapability('onoff.switch_6', this.CLUSTER.ON_OFF, {
      endpoint: 6
    });
  }

  async onDeleted() {
    this.log('SwitchWall6GangDevice deleted');
    await super.onDeleted();
  }
}

module.exports = SwitchWall6GangDevice;
