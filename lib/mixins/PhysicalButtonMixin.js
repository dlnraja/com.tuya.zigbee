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

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║   MANUFACTURER-SPECIFIC DEVICE PROFILES                                      ║
 * ║   Based on Z2M, ZHA research and user feedback from forum                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║   Sources:                                                                   ║
 * ║   - Z2M #14523: TS0003 individual channel issue                              ║
 * ║   - ZHA #2443: TS0003/TS0004 group toggle bug (0xE000/0xE001 clusters)       ║
 * ║   - Forum: BSEED, Zemismart, Moes switches user reports                      ║
 * ║   - PR #116: packetninja BSEED physical button detection                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
const DEVICE_PROFILES = {
  // ════════════════════════════════════════════════════════════════════════════
  // BSEED Switches - Use ZCL only, clusters 0xE000/0xE001, slow response
  // From: PR #116, forum diagnostics, Blakadder database
  // ════════════════════════════════════════════════════════════════════════════
  '_TZ3000_blhvsaqf': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', customClusters: [0xE000, 0xE001], brand: 'BSEED'
  },
  '_TZ3000_ysdv91bk': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', customClusters: [0xE000, 0xE001], brand: 'BSEED'
  },
  '_TZ3000_hafsqare': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', customClusters: [0xE000, 0xE001], brand: 'BSEED'
  },
  '_TZ3000_e98krvvk': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', customClusters: [0xE000, 0xE001], brand: 'BSEED'
  },
  '_TZ3000_iedbgyxt': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', customClusters: [0xE000, 0xE001], brand: 'BSEED'
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Zemismart Switches - Similar to BSEED, have 0xE000/0xE001 clusters
  // ZHA #2443: "all gangs toggle together" bug - needs per-endpoint control
  // ════════════════════════════════════════════════════════════════════════════
  '_TZ3000_a37eix1s': { 
    appCommandWindow: 1500, doubleClickWindow: 400, longPressThreshold: 700,
    protocol: 'zcl_only', customClusters: [0xE000, 0xE001], brand: 'Zemismart',
    perEndpointControl: true  // Must send to specific endpoint, not broadcast
  },
  '_TZ3000_empogkya': { 
    appCommandWindow: 1500, doubleClickWindow: 400, longPressThreshold: 700,
    protocol: 'zcl_only', customClusters: [0xE000, 0xE001], brand: 'Zemismart',
    perEndpointControl: true
  },
  '_TZ3000_18ejxrzk': { 
    appCommandWindow: 1500, doubleClickWindow: 400, longPressThreshold: 700,
    protocol: 'zcl_only', customClusters: [0xE000, 0xE001], brand: 'Zemismart',
    perEndpointControl: true
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Moes Switches - Various timing requirements per user feedback
  // Forum: Freddyboy _TZ3000_zgyzgdua scene switch issues
  // ════════════════════════════════════════════════════════════════════════════
  '_TZ3000_zgyzgdua': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', sceneSwitch: true
  },
  '_TZ3000_tbfw36ye': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes'
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Lonsonho/Tuya Generic - Standard timing, Tuya DP protocol
  // ════════════════════════════════════════════════════════════════════════════
  '_TZ3000_cfnprab5': { 
    appCommandWindow: 500, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'tuya_dp', brand: 'Lonsonho'
  },
  '_TZ3000_vjhcxkzb': { 
    appCommandWindow: 500, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'tuya_dp', brand: 'Lonsonho'
  },

  // ════════════════════════════════════════════════════════════════════════════
  // TS0726 - BSEED 4-gang with special bindings (Hartmut_Dunker forum)
  // Needs explicit onOff cluster binding per endpoint
  // ════════════════════════════════════════════════════════════════════════════
  '_TZ3002_pzao9ls1': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', brand: 'BSEED', productId: 'TS0726',
    requiresExplicitBinding: true
  },
  '_TZ3002_vaq2bfcu': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', brand: 'BSEED', productId: 'TS0726',
    requiresExplicitBinding: true
  },

  // ════════════════════════════════════════════════════════════════════════════
  // HOBEIAN Switches - User reports from forum
  // ════════════════════════════════════════════════════════════════════════════
  'HOBEIAN': { 
    appCommandWindow: 1000, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'HOBEIAN'
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Default profile for unknown manufacturers
  // ════════════════════════════════════════════════════════════════════════════
  'default': { 
    appCommandWindow: 500, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'auto', brand: 'Generic'
  }
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
   * Get the full device profile for this manufacturer
   * Returns profile with timing, protocol, and special flags
   */
  getDeviceProfile() {
    // Get manufacturer name from multiple sources
    const manufacturerName = this.getSetting?.('zb_manufacturer_name') || 
                             this.getStoreValue?.('zb_manufacturer_name') ||
                             this.getStoreValue?.('manufacturerName') ||
                             this.zclNode?.endpoints?.[1]?.clusters?.basic?.attributes?.manufacturerName ||
                             '';
    
    // Check for match in device profiles
    for (const [mfr, profile] of Object.entries(DEVICE_PROFILES)) {
      if (mfr !== 'default' && manufacturerName.toLowerCase().includes(mfr.toLowerCase())) {
        this.log?.(`[PROFILE] Matched ${mfr} for "${manufacturerName}"`);
        return { ...profile, manufacturerName: mfr, detectedName: manufacturerName };
      }
    }
    
    return { ...DEVICE_PROFILES.default, manufacturerName: 'unknown', detectedName: manufacturerName };
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

    // Get device profile for defaults
    const deviceProfile = this.getDeviceProfile();

    // If settings configured, override defaults (but keep profile metadata)
    if (settingsAppWindow || settingsDoubleClick || settingsLongPress) {
      const profile = {
        ...deviceProfile,
        appCommandWindow: settingsAppWindow || deviceProfile.appCommandWindow,
        doubleClickWindow: settingsDoubleClick || deviceProfile.doubleClickWindow,
        longPressThreshold: settingsLongPress || deviceProfile.longPressThreshold
      };
      this.log(`[PHYSICAL] Using SETTINGS profile (base: ${deviceProfile.brand})`);
      return profile;
    }

    this.log(`[PHYSICAL] Using ${deviceProfile.brand} device profile (mfr: ${deviceProfile.manufacturerName})`);
    return deviceProfile;
  }

  /**
   * Check if this device requires ZCL-only mode (no Tuya DP)
   */
  isZclOnlyDevice() {
    const profile = this.getDeviceProfile();
    return profile.protocol === 'zcl_only';
  }

  /**
   * Check if this device has custom Tuya clusters (0xE000/0xE001)
   */
  hasCustomClusters() {
    const profile = this.getDeviceProfile();
    return profile.customClusters && profile.customClusters.length > 0;
  }

  /**
   * Check if this device requires per-endpoint control
   * (ZHA #2443: prevents "all gangs toggle together" bug)
   */
  requiresPerEndpointControl() {
    const profile = this.getDeviceProfile();
    return profile.perEndpointControl === true;
  }

  /**
   * Check if this device requires explicit cluster binding
   * (TS0726 BSEED 4-gang - Hartmut_Dunker forum)
   */
  requiresExplicitBinding() {
    const profile = this.getDeviceProfile();
    return profile.requiresExplicitBinding === true;
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

    // v5.5.910: Wrap in try-catch - getDeviceTriggerCard throws synchronously if card doesn't exist
    try {
      const flowCard = this.homey.flow.getDeviceTriggerCard(flowCardId);
      flowCard.trigger(this, flowTokens, {})
        .then(() => this.log(`[PHYSICAL] ✅ Flow triggered: ${flowCardId}`))
        .catch(err => this.log(`[PHYSICAL] ⚠️ Trigger failed: ${err.message}`));
    } catch (err) {
      // Flow card not defined for this driver - this is normal for drivers without physical flow cards
      this.log(`[PHYSICAL] ℹ️ Flow card not available: ${flowCardId} (${err.message})`);
      
      // Try fallback to on/off flow cards if this was a single/double/triple press
      if (pressType === 'single' || pressType === 'double' || pressType === 'triple') {
        try {
          const fallbackId = gangCount === 1 
            ? `${driverId}_physical_on`
            : `${driverId}_physical_gang${gang}_on`;
          const fallbackCard = this.homey.flow.getDeviceTriggerCard(fallbackId);
          fallbackCard.trigger(this, flowTokens, {})
            .catch(() => {});
        } catch (e) {
          // No fallback available either - silent fail
        }
      }
    }
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
