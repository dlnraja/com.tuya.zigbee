'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV2 = require('../../lib/battery/BatteryManagerV2');
const ButtonRemoteManager = require('../../lib/ButtonRemoteManager');

/**
 * switch_wireless_1gang - Wireless Button/Remote Driver
 *
 * CRITICAL: This is a BUTTON/REMOTE device - it SENDS commands, NOT receives states!
 * - NO onoff/dim capabilities (buttons don't have state)
 * - NO attribute reporting configuration (causes timeouts)
 * - Uses ButtonRemoteManager for flow triggers
 * - Battery-powered (CR2032 typically)
 *
 * Model: TS0041
 * Manufacturer: _TZ3000_*
 */

// Create hybrid base
const HybridDevice = HybridDriverSystem.createHybridDevice();

/**
 * WirelessSwitch1gangDevice - 1-Gang Wireless Button
 * Sends ZCL commands (single/double/long press) to trigger Homey flows
 */
class WirelessSwitch1gangDevice extends HybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('[TS0041] 🎛️  Wireless 1-gang button initializing...');

    // Run hybrid system initialization (Smart-Adapt, battery detection, etc.)
    await super.onNodeInit({ zclNode });

    // CRITICAL: Attach ButtonRemoteManager for flow triggers
    // This binds to onOff/levelControl/scenes clusters and listens for COMMANDS
    try {
      await ButtonRemoteManager.attach(this, zclNode, {
        endpointId: 1,
        buttonCount: 1
      });
      this.log('[TS0041] ✅ ButtonRemoteManager attached - flows will work!');
    } catch (err) {
      this.error('[TS0041] ❌ Failed to attach ButtonRemoteManager:', err);
      this.error('[TS0041]    Flows may not work correctly!');
    }

    this.log('[TS0041] ✅ Wireless button initialized');
    this.log('[TS0041]    Model: TS0041 (1-gang)');
    this.log('[TS0041]    Power: Battery');
    this.log('[TS0041]    Flows: Remote button pressed (single/double/long)');
  }

  async onDeleted() {
    this.log('[TS0041] 🔌 Wireless button deleted');

    // Detach ButtonRemoteManager
    ButtonRemoteManager.detach(this);

    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = WirelessSwitch1gangDevice;
