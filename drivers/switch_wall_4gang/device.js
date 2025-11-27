'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV2 = require('../../lib/battery/BatteryManagerV2');

/**
 * switch_wall_4gang - Hybrid-Enhanced Driver
 *
 * MIGRATION: Original driver enhanced with Hybrid System
 * - Auto-adaptive capabilities
 * - Energy-aware management
 * - Smart detection
 */

// Create hybrid base
const HybridDevice = HybridDriverSystem.createHybridDevice();

'use strict';

const { CLUSTER } = require('zigbee-clusters');
const SwitchDevice = require('../../lib/devices/SwitchDevice');

/**
 * SwitchWall4GangDevice - Unified 4-gang wall switch
 * Auto-detects AC/DC power source
 * Handles 4 independent switches
 */
class SwitchWall4GangDevice extends HybridDevice {

  async onNodeInit({ zclNode }) {
    // Hybrid system initialization
    await super.onNodeInit({ zclNode });

    // Original initialization below:
    this.log('SwitchWall4GangDevice initializing...');
    
    // Set switch count for this device
    this.switchCount = 4;
    this.switchType = 'wall';
    
    // Initialize base (power detection + switch control)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('SwitchWall4GangDevice initialized - 4 switches ready');
  }

  /**
   * Register capabilities for 4 switches
   */
  async registerSwitchCapabilities() {
    this.log('🔌 Registering 4-gang switch capabilities...');
    
    // Switch 1 (endpoint 1)
    if (this.hasCapability('onoff')) {
      this.log('  - Switch 1 on endpoint 1');
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: 1,
        get: 'onOff',
        set: 'onOff',
        setParser: value => ({ value }),
        report: 'onOff',
        reportParser: value => { this.log('[RECV] Switch 1:', value ? 'ON' : 'OFF'); return value; }
      });
      this.log('[OK] ✅ Switch 1 configured');
    }
    
    // Switch 2 (endpoint 2)
    if (this.hasCapability('onoff.switch_2')) {
      this.log('  - Switch 2 on endpoint 2');
      this.registerCapability('onoff.switch_2', CLUSTER.ON_OFF, {
        endpoint: 2,
        get: 'onOff',
        set: 'onOff',
        setParser: value => ({ value }),
        report: 'onOff',
        reportParser: value => { this.log('[RECV] Switch 2:', value ? 'ON' : 'OFF'); return value; }
      });
      this.log('[OK] ✅ Switch 2 configured');
    }
    
    // Switch 3 (endpoint 3)
    if (this.hasCapability('onoff.switch_3')) {
      this.log('  - Switch 3 on endpoint 3');
      this.registerCapability('onoff.switch_3', CLUSTER.ON_OFF, {
        endpoint: 3,
        get: 'onOff',
        set: 'onOff',
        setParser: value => ({ value }),
        report: 'onOff',
        reportParser: value => { this.log('[RECV] Switch 3:', value ? 'ON' : 'OFF'); return value; }
      });
      this.log('[OK] ✅ Switch 3 configured');
    }
    
    // Switch 4 (endpoint 4)
    if (this.hasCapability('onoff.switch_4')) {
      this.log('  - Switch 4 on endpoint 4');
      this.registerCapability('onoff.switch_4', CLUSTER.ON_OFF, {
        endpoint: 4,
        get: 'onOff',
        set: 'onOff',
        setParser: value => ({ value }),
        report: 'onOff',
        reportParser: value => { this.log('[RECV] Switch 4:', value ? 'ON' : 'OFF'); return value; }
      });
      this.log('[OK] ✅ Switch 4 configured');
    }
    
    this.log('[OK] All 4 switches configured successfully');
  }

  async onDeleted() {
    this.log('SwitchWall4GangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = SwitchWall4GangDevice;


module.exports = SwitchWall4GangDevice;
