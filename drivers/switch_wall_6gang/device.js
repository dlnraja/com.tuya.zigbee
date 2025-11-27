'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');

/**
 * switch_wall_6gang - Hybrid-Enhanced Driver
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
 * SwitchWall6GangDevice - Unified 6-gang wall switch
 * Auto-detects AC/DC power source
 * Handles 6 independent switches
 */
class SwitchWall6GangDevice extends HybridDevice {

  async onNodeInit({ zclNode }) {
    // Hybrid system initialization
    await super.onNodeInit({ zclNode });

    // Original initialization below:
    this.log('SwitchWall6GangDevice initializing...');
    
    // Set switch count for this device
    this.switchCount = 6;
    this.switchType = 'wall';
    
    // Initialize base (power detection + switch control)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('SwitchWall6GangDevice initialized - 6 switches ready');
  }

  /**
   * Register capabilities for 6 switches
   */
  async registerSwitchCapabilities() {
    this.log('🔌 Registering 6-gang switch capabilities...');
    
    const switches = [
      { cap: 'onoff', ep: 1, name: 'Switch 1' },
      { cap: 'onoff.switch_2', ep: 2, name: 'Switch 2' },
      { cap: 'onoff.switch_3', ep: 3, name: 'Switch 3' },
      { cap: 'onoff.switch_4', ep: 4, name: 'Switch 4' },
      { cap: 'onoff.switch_5', ep: 5, name: 'Switch 5' },
      { cap: 'onoff.switch_6', ep: 6, name: 'Switch 6' }
    ];
    
    for (const sw of switches) {
      if (this.hasCapability(sw.cap)) {
        this.log(`  - ${sw.name} on endpoint ${sw.ep}`);
        this.registerCapability(sw.cap, CLUSTER.ON_OFF, {
          endpoint: sw.ep,
          get: 'onOff',
          set: 'onOff',
          setParser: value => ({ value }),
          report: 'onOff',
          reportParser: value => { this.log(`[RECV] ${sw.name}:`, value ? 'ON' : 'OFF'); return value; }
        });
        this.log(`[OK] ✅ ${sw.name} configured`);
      }
    }
    
    this.log('[OK] All 6 switches configured successfully');
  }

  async onDeleted() {
    this.log('SwitchWall6GangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = SwitchWall6GangDevice;


module.exports = SwitchWall6GangDevice;
