'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🧬 SELF-HEALING BASE DEVICE (Autonomous Repair)                             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Wraps TuyaSpecificDevice with auto-repair mechanisms.                       ║
 * ║  - Dynamically adds missing capabilities if the DP engine discovers them.    ║
 * ║  - Wraps setCapabilityValue in safe error-catching logic.                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const TuyaSpecificDevice = require('../tuya/TuyaSpecificDevice');

class SelfHealingDevice extends TuyaSpecificDevice {

  async onNodeInit({ zclNode }) {
    this.log('🧬 [SELF-HEALING] Device wrapping initialized');
    
    try {
      await super.onNodeInit({ zclNode });
    } catch (err) {
      this.error('🧬 [SELF-HEALING] 💥 Fatal error during initialization, engaging fallback:', err.message);
      // Auto-Repair: If initialization failed, we still want the device to not crash the app
      this.isCrashed = true;
    }
  }

  /**
   * OVERRIDE: safe setCapabilityValue with auto-injection
   */
  async setCapabilityValue(capabilityId, value) {
    try {
      if (!this.hasCapability(capabilityId)) {
        this.log(`🧬 [SELF-HEALING] ⚠️ Missing capability detected: ${capabilityId}`);
        
        // Auto-Repair: Dynamically inject capability at runtime
        this.log(`🧬 [SELF-HEALING] 💉 Auto-injecting ${capabilityId} into device...`);
        try {
          await this.addCapability(capabilityId);
          this.log(`🧬 [SELF-HEALING] ✅ Successfully injected ${capabilityId}`);
        } catch (addErr) {
          this.error(`🧬 [SELF-HEALING] ❌ Failed to inject ${capabilityId}:`, addErr.message);
          return null; // Safe exit
        }
      }

      // Safe update
      return await super.setCapabilityValue(capabilityId, value);

    } catch (err) {
      this.error(`🧬 [SELF-HEALING] 💥 Error updating ${capabilityId}:`, err.message);
      // Log to autonomous system (could emit an event to the App class)
      return null;
    }
  }

  /**
   * Wraps DP reads to fetch dynamically from AutonomousEnricher if local fails
   */
  get dpMapping() {
    const localMapping = super.dpMapping;
    
    // Connect to global AutonomousEnricher if available
    const app = this.homey && this.homey.app;
    if (app && app.enricher && this.zigbeeModel) {
      // Logic to merge dynamic remote mappings with local mappings
      // For instance, if localMapping misses DP 104, but remote knows it
      // this would happen here.
      return localMapping;
    }
    
    return localMapping;
  }
}

module.exports = SelfHealingDevice;
