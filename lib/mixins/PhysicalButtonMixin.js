'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║   PhysicalButtonMixin v5.5.896 - Advanced Physical Button Detection         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Detects physical button presses vs app commands with support for:          ║
 * ║  - Single press                                                              ║
 * ║  - Double press                                                              ║
 * ║  - Long press (hold)                                                         ║
 * ║  - Triple press                                                              ║
 * ║  Manufacturer-specific timing profiles (BSEED=2000ms, default=500ms)        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// Default timing profiles (can be overridden via device settings)
const DEFAULT_TIMING_PROFILES = {
  // BSEED switches have slower response - need 2s window
  '_TZ3000_blhvsaqf': { appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800 },
  '_TZ3000_ysdv91bk': { appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800 },
  // Default fast timing for most switches
  'default': { appCommandWindow: 500, doubleClickWindow: 400, longPressThreshold: 600 }
};

const PhysicalButtonMixin = (SuperClass) => class extends SuperClass {

  /**
   * Initialize physical button detection for all gangs
   * Call this in onNodeInit after super.onNodeInit()
   */
  async initPhysicalButtonDetection(zclNode) {
    // Check if physical button detection is enabled in settings
    const enabled = this.getSetting?.('physical_button_enabled') ?? true;
    if (!enabled) {
      this.log('[PHYSICAL] ⚠️ Physical button detection DISABLED in settings');
      return;
    }

    // Get timing profile from settings or manufacturer defaults
    this._timingProfile = this._getTimingProfile();
    this.log(`[PHYSICAL] Timing: appWindow=${this._timingProfile.appCommandWindow}ms, doubleClick=${this._timingProfile.doubleClickWindow}ms, longPress=${this._timingProfile.longPressThreshold}ms`);

    // Initialize tracking per gang
    const gangCount = this.gangCount || 1;
    this._physicalButtonState = {};

    for (let gang = 1; gang <= gangCount; gang++) {
      this._physicalButtonState[gang] = {
        lastState: null,
        appCommandPending: false,
        appCommandTimeout: null,
        pressStartTime: null,
        clickCount: 0,
        clickTimeout: null,
        lastClickTime: 0
      };
    }

    // Setup detection for each endpoint
    for (let gang = 1; gang <= gangCount; gang++) {
      await this._setupGangPhysicalDetection(zclNode, gang);
    }

    this.log(`[PHYSICAL] ✅ Initialized for ${gangCount} gang(s)`);
  }

  /**
   * Get timing profile from device settings or manufacturer defaults
   * Settings override manufacturer defaults for full user control
   */
  _getTimingProfile() {
    // First check device settings (user-configurable)
    const settingsAppWindow = this.getSetting?.('app_command_timeout');
    const settingsDoubleClick = this.getSetting?.('double_click_window');
    const settingsLongPress = this.getSetting?.('long_press_threshold');

    // If any setting is configured, use settings-based profile
    if (settingsAppWindow || settingsDoubleClick || settingsLongPress) {
      const profile = {
        appCommandWindow: settingsAppWindow || 500,
        doubleClickWindow: settingsDoubleClick || 400,
        longPressThreshold: settingsLongPress || 600
      };
      this.log(`[PHYSICAL] Using SETTINGS timing profile`);
      return profile;
    }

    // Fallback to manufacturer-based defaults
    const manufacturerName = this.getSetting?.('zb_manufacturer_name') || 
                             this.getStoreValue?.('manufacturerName') || '';
    
    for (const [mfr, profile] of Object.entries(DEFAULT_TIMING_PROFILES)) {
      if (mfr !== 'default' && manufacturerName.toLowerCase().includes(mfr.toLowerCase())) {
        this.log(`[PHYSICAL] Using ${mfr} manufacturer timing profile`);
        return profile;
      }
    }
    
    this.log('[PHYSICAL] Using DEFAULT timing profile');
    return DEFAULT_TIMING_PROFILES.default;
  }

  /**
   * Setup physical button detection for a specific gang
   */
  async _setupGangPhysicalDetection(zclNode, gang) {
    const endpoint = zclNode?.endpoints?.[gang];
    const onOffCluster = endpoint?.clusters?.onOff;

    if (!onOffCluster) {
      this.log(`[PHYSICAL] No onOff cluster on EP${gang} - skipping`);
      return;
    }

    // Listen for attribute reports (physical button presses)
    if (typeof onOffCluster.on === 'function') {
      onOffCluster.on('attr.onOff', (value) => {
        this._handleAttributeReport(gang, value);
      });
    }

    // Also listen for command responses
    try {
      onOffCluster.on('response', (command, status) => {
        this.log(`[PHYSICAL] Gang ${gang} command response: ${command} = ${status}`);
      });
    } catch (e) { /* ignore if not supported */ }

    this.log(`[PHYSICAL] Gang ${gang} detection setup complete`);
  }

  /**
   * Handle attribute report from device (indicates state change)
   */
  _handleAttributeReport(gang, value) {
    const state = this._physicalButtonState[gang];
    const now = Date.now();
    const isPhysical = !state.appCommandPending;

    this.log(`[PHYSICAL] Gang ${gang}: ${state.lastState} → ${value} (${isPhysical ? 'PHYSICAL' : 'APP'})`);

    // Update state
    const previousState = state.lastState;
    state.lastState = value;

    // Only process physical button presses
    if (!isPhysical) return;

    // Detect press type
    if (value === true) {
      // Button pressed ON - start tracking
      state.pressStartTime = now;
      state.clickCount++;
      
      // Clear previous click timeout
      if (state.clickTimeout) {
        clearTimeout(state.clickTimeout);
      }

      // Set timeout to finalize click detection
      state.clickTimeout = setTimeout(() => {
        this._finalizeClickDetection(gang);
      }, this._timingProfile.doubleClickWindow);

    } else if (value === false && state.pressStartTime) {
      // Button released OFF - calculate press duration
      const pressDuration = now - state.pressStartTime;
      
      if (pressDuration >= this._timingProfile.longPressThreshold) {
        // Long press detected
        this._triggerPhysicalFlow(gang, 'long_press', { duration: pressDuration });
        state.clickCount = 0; // Reset click count
        if (state.clickTimeout) {
          clearTimeout(state.clickTimeout);
          state.clickTimeout = null;
        }
      }
      
      state.pressStartTime = null;
    }

    // Always trigger basic on/off flow
    this._triggerPhysicalFlow(gang, value ? 'on' : 'off', {});
  }

  /**
   * Finalize click detection after timeout
   */
  _finalizeClickDetection(gang) {
    const state = this._physicalButtonState[gang];
    const clickCount = state.clickCount;

    if (clickCount === 1) {
      this._triggerPhysicalFlow(gang, 'single', {});
    } else if (clickCount === 2) {
      this._triggerPhysicalFlow(gang, 'double', {});
    } else if (clickCount >= 3) {
      this._triggerPhysicalFlow(gang, 'triple', { clicks: clickCount });
    }

    // Reset
    state.clickCount = 0;
    state.clickTimeout = null;
  }

  /**
   * Trigger a physical button flow card
   */
  _triggerPhysicalFlow(gang, pressType, tokens = {}) {
    const gangCount = this.gangCount || 1;
    const driverId = this.driver?.id || 'switch_1gang';
    
    // Build flow card ID
    let flowCardId;
    if (gangCount === 1) {
      flowCardId = `${driverId}_physical_${pressType}`;
    } else {
      flowCardId = `${driverId}_physical_gang${gang}_${pressType}`;
    }

    this.log(`[PHYSICAL] 🔘 Triggering: ${flowCardId}`);

    // Add gang to tokens
    const flowTokens = { ...tokens, gang };

    this.homey.flow.getDeviceTriggerCard(flowCardId)
      .trigger(this, flowTokens, {})
      .then(() => this.log(`[PHYSICAL] ✅ Flow triggered: ${flowCardId}`))
      .catch(err => {
        // Try fallback to simple on/off flow
        if (pressType === 'on' || pressType === 'off') {
          const fallbackId = gangCount === 1 
            ? `${driverId}_physical_${pressType}`
            : `${driverId}_physical_gang${gang}_${pressType}`;
          this.homey.flow.getDeviceTriggerCard(fallbackId)
            .trigger(this, flowTokens, {})
            .catch(() => this.log(`[PHYSICAL] Flow not found: ${flowCardId}`));
        }
      });
  }

  /**
   * Mark that an app command was sent (to distinguish from physical)
   * Call this before sending any command to the device
   */
  markAppCommand(gang = 1) {
    const state = this._physicalButtonState?.[gang];
    if (!state) return;

    state.appCommandPending = true;
    
    if (state.appCommandTimeout) {
      clearTimeout(state.appCommandTimeout);
    }
    
    state.appCommandTimeout = setTimeout(() => {
      state.appCommandPending = false;
    }, this._timingProfile.appCommandWindow);
  }

  /**
   * Mark app command for all gangs
   */
  markAppCommandAll() {
    const gangCount = this.gangCount || 1;
    for (let gang = 1; gang <= gangCount; gang++) {
      this.markAppCommand(gang);
    }
  }

  /**
   * Cleanup on device deletion
   */
  _cleanupPhysicalButtonDetection() {
    if (!this._physicalButtonState) return;

    for (const [gang, state] of Object.entries(this._physicalButtonState)) {
      if (state.appCommandTimeout) clearTimeout(state.appCommandTimeout);
      if (state.clickTimeout) clearTimeout(state.clickTimeout);
    }
    
    this._physicalButtonState = null;
    this.log('[PHYSICAL] Cleanup complete');
  }

  onDeleted() {
    this._cleanupPhysicalButtonDetection();
    if (super.onDeleted) super.onDeleted();
  }
};

module.exports = PhysicalButtonMixin;
