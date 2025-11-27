'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');

/**
 * switch_generic_3gang - Hybrid-Enhanced Driver
 *
 * MIGRATION: Original driver enhanced with Hybrid System
 * - Auto-adaptive capabilities
 * - Energy-aware management
 * - Smart detection
 */

// Create hybrid base
const HybridDevice = HybridDriverSystem.createHybridDevice();

﻿'use strict';

const SwitchDevice = require('../../lib/devices/SwitchDevice');

/**
 * TuyaSmartSwitch3gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class TuyaSmartSwitch3gangDevice extends HybridDevice {

  async onNodeInit({ zclNode }) {
    // Hybrid system initialization
    await super.onNodeInit({ zclNode });

    // Original initialization below:
    this.log('TuyaSmartSwitch3gangDevice initializing...');

      // CRITICAL: Set gang count BEFORE parent init
      this.gangCount = 3;
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('TuyaSmartSwitch3gangDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('TuyaSmartSwitch3gangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = TuyaSmartSwitch3gangDevice;


module.exports = TuyaSmartSwitch3gangDevice;
