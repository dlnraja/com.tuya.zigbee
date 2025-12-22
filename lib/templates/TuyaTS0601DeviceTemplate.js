'use strict';

/**
 * TuyaTS0601DeviceTemplate - v5.3.15
 *
 * CORRECT implementation template for Tuya TS0601 devices in Homey SDK3
 *
 * USE THIS AS REFERENCE for all TS0601 drivers!
 *
 * KEY PRINCIPLES:
 * 1. Initialize ONLY in device.js, never in driver.js
 * 2. Use guard flags to prevent double initialization
 * 3. Setup Tuya cluster wrapper BEFORE anything else
 * 4. Handle sleepy devices correctly (passive mode)
 * 5. Use unified battery handler
 * 6. Register flow cards ONLY if capability exists
 */

const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaClusterWrapper = require('../tuya/TuyaClusterWrapper');
const UnifiedBatteryHandler = require('../battery/UnifiedBatteryHandler');

class TuyaTS0601DeviceTemplate extends ZigBeeDevice {

  /**
   * STEP 1: onNodeInit - Main entry point
   *
   * CRITICAL: Use guard flag to prevent double initialization!
   */
  async onNodeInit({ zclNode }) {
    // ═══════════════════════════════════════════════════════════════
    // GUARD: Prevent double initialization
    // ═══════════════════════════════════════════════════════════════
    if (this._ts0601Initialized) {
      this.log('[TS0601] ⚠️ Already initialized, skipping');
      return;
    }
    this._ts0601Initialized = true;

    this.log('');
    this.log('╔═══════════════════════════════════════════════════════════════════╗');
    this.log('║           TUYA TS0601 DEVICE - SDK3 CORRECT IMPLEMENTATION        ║');
    this.log('╚═══════════════════════════════════════════════════════════════════╝');

    // Store zclNode reference
    this.zclNode = zclNode;

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Initialize Tuya Cluster Wrapper FIRST
    // ═══════════════════════════════════════════════════════════════
    this.log('[TS0601] Step 1: Initializing Tuya cluster wrapper...');

    this.tuyaWrapper = new TuyaClusterWrapper(this);
    await this.tuyaWrapper.initialize(zclNode);

    // Setup DP event handlers
    this._setupDPHandlers();

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Initialize Battery Handler
    // ═══════════════════════════════════════════════════════════════
    this.log('[TS0601] Step 2: Initializing battery handler...');

    this.batteryHandler = new UnifiedBatteryHandler(this);
    await this.batteryHandler.initialize(zclNode);

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: Setup Device-Specific Capabilities
    // ═══════════════════════════════════════════════════════════════
    this.log('[TS0601] Step 3: Setting up capabilities...');

    await this._setupCapabilities();

    // ═══════════════════════════════════════════════════════════════
    // STEP 5: Request Initial DP Values (for mains devices)
    // ═══════════════════════════════════════════════════════════════
    this.log('[TS0601] Step 4: Requesting initial data...');

    // Only for mains-powered devices
    const isSleepy = await this._checkIfSleepy();
    if (!isSleepy) {
      // Query all DPs
      setTimeout(() => {
        this.tuyaWrapper.queryAllDPs().catch(() => { });
      }, 2000);
    } else {
      this.log('[TS0601] 😴 Sleepy device - waiting for wake-up');
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 6: Set device available
    // ═══════════════════════════════════════════════════════════════
    this.log('[TS0601] Step 5: Setting device available...');

    await this.setAvailable().catch(() => { });

    this.log('[TS0601] ✅ Initialization complete!');
  }

  /**
   * Setup DP event handlers
   * Override this in subclass for device-specific DPs
   */
  _setupDPHandlers() {
    this.log('[TS0601] Setting up DP handlers...');

    // Generic DP handler
    this.tuyaWrapper.on('dp', ({ dp, type, value }) => {
      this.log(`[TS0601] 📊 DP${dp} received: ${JSON.stringify(value)}`);
      this._handleDP(dp, type, value);
    });

    // Common DPs that most TS0601 devices use
    // Override in subclass for specific mappings

    // Battery (various DPs)
    [4, 10, 14, 15, 101].forEach(batteryDP => {
      this.tuyaWrapper.on(`dp-${batteryDP}`, (value) => {
        this.log(`[TS0601] 🔋 Battery DP${batteryDP}: ${value}%`);
        if (this.hasCapability('measure_battery')) {
          const percent = Math.max(0, Math.min(100, value));
          this.setCapabilityValue('measure_battery', percent).catch(() => { });
        }
      });
    });
  }

  /**
   * Handle incoming DP
   * Override in subclass for device-specific logic
   */
  _handleDP(dp, type, value) {
    // Store all DPs for debugging
    this.setStoreValue(`dp_${dp}`, value).catch(() => { });
    this.setStoreValue('last_dp_time', Date.now()).catch(() => { });

    // Subclass should override this for specific DP handling
  }

  /**
   * Setup capabilities based on device profile
   * Override in subclass
   */
  async _setupCapabilities() {
    // Example: register capability listeners

    // OnOff example (DP 1 for many devices)
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        this.log(`[TS0601] Setting onoff: ${value}`);
        await this.tuyaWrapper.setDP(1, TuyaClusterWrapper.DP_TYPE.BOOL, value);
      });
    }

    // Dim example (DP 2 for dimmers)
    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', async (value) => {
        const percent = Math.round(value * 1000); // 0-1000 scale
        this.log(`[TS0601] Setting dim: ${percent}`);
        await this.tuyaWrapper.setDP(2, TuyaClusterWrapper.DP_TYPE.VALUE, percent);
      });
    }
  }

  /**
   * Check if device is sleepy (battery powered)
   */
  async _checkIfSleepy() {
    // Battery devices are sleepy
    if (this.hasCapability('measure_battery')) {
      return true;
    }

    // Check battery handler
    if (this.batteryHandler?.getSource() === 'tuya') {
      return true;
    }

    return false;
  }

  /**
   * Send DP value helper
   */
  async sendDP(dp, type, value) {
    return this.tuyaWrapper.setDP(dp, type, value);
  }

  /**
   * Send boolean DP
   */
  async sendBoolDP(dp, value) {
    return this.sendDP(dp, TuyaClusterWrapper.DP_TYPE.BOOL, value);
  }

  /**
   * Send value DP (integer)
   */
  async sendValueDP(dp, value) {
    return this.sendDP(dp, TuyaClusterWrapper.DP_TYPE.VALUE, value);
  }

  /**
   * Send enum DP
   */
  async sendEnumDP(dp, value) {
    return this.sendDP(dp, TuyaClusterWrapper.DP_TYPE.ENUM, value);
  }

  /**
   * onDeleted - Cleanup
   */
  async onDeleted() {
    this.log('[TS0601] Device deleted, cleaning up...');

    // Remove all listeners
    if (this.tuyaWrapper) {
      this.tuyaWrapper.removeAllListeners();
    }

    // Call parent
    if (super.onDeleted) {
      await super.onDeleted();
    }
  }
}

module.exports = TuyaTS0601DeviceTemplate;
