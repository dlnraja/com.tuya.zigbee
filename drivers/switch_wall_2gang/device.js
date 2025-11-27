'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');

/**
 * switch_wall_2gang - Hybrid-Enhanced Driver
 *
 * MIGRATION: Original driver enhanced with Hybrid System
 * - Auto-adaptive capabilities
 * - Energy-aware management
 * - Smart detection
 */

// Create hybrid base
const HybridDevice = HybridDriverSystem.createHybridDevice();

'use strict';

const SwitchDevice = require('../../lib/devices/SwitchDevice');

/**
 * SwitchWall2GangDevice - Unified 2-gang wall switch
 * Auto-detects AC/DC power source
 * Handles 2 independent switches
 */
class SwitchWall2GangDevice extends HybridDevice {

  async onNodeInit({ zclNode }) {
    // Hybrid system initialization
    await super.onNodeInit({ zclNode });

    // Original initialization below:
    this.log('SwitchWall2GangDevice initializing...');
    
    // Set gang count for this device (used by SwitchDevice base class)
    this.gangCount = 2;
    this.switchType = 'wall';
    
    // Initialize base (power detection + switch control)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('SwitchWall2GangDevice initialized - 2 gangs ready');
  }

  async onDeleted() {
    this.log('SwitchWall2GangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = SwitchWall2GangDevice;


module.exports = SwitchWall2GangDevice;
