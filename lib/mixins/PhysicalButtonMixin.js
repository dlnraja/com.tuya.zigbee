'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║   PhysicalButtonMixin v5.5.999 - Advanced Physical Button Detection         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Detects physical button presses vs app commands with support for:          ║
 * ║  - Single press                                                              ║
 * ║  - Double press                                                              ║
 * ║  - Long press (hold)                                                         ║
 * ║  - Triple press                                                              ║
 * ║  Manufacturer-specific timing profiles (BSEED=2000ms, default=500ms)        ║
 * ║  v5.5.999: Enhanced state tracking for all buttons (packetninja pattern)    ║
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
  // v5.8.1: BSEED 2-gang (Pieter_Pessers forum report)
  '_TZ3000_l9brjwau': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', brand: 'BSEED', productId: 'TS0012'
  },
  // v5.8.1: BSEED 3-gang
  '_TZ3000_qkixdnon': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', brand: 'BSEED', productId: 'TS0013'
  },
  '_TZ3000_v4l4b0lp': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', brand: 'BSEED', productId: 'TS0013'
  },
  '_TZ3000_zivfvd7h': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', brand: 'BSEED', productId: 'TS0013'
  },
  '_TZ3000_cfz9h9re': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', brand: 'BSEED', productId: 'TS0013'
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
    protocol: 'hybrid', brand: 'Moes', sceneSwitch: true, usesE000: true
  },
  '_TZ3000_abrsvsou': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', usesE000: true
  },
  '_TZ3000_mh9px7cq': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', usesE000: true
  },
  '_TZ3000_uri7ez8u': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', usesE000: true
  },
  '_TZ3000_rrjr1q0u': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', usesE000: true
  },
  '_TZ3000_vp6clf9d': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', usesE000: true
  },
  // v5.8.0: From Hubitat kkossev TS004F driver research
  '_TZ3000_fa9mlvja': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', usesE000: true, productId: 'TS0041'
  },
  '_TZ3000_s0i14ubi': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', usesE000: true, productId: 'TS0041'
  },
  '_TZ3000_mrpevh8p': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', usesE000: true, productId: 'TS0041'
  },
  '_TZ3000_tzvbimpq': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0042'
  },
  '_TZ3000_t8hzpgnd': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0042'
  },
  '_TZ3000_h1c2eamp': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0042'
  },
  // v5.8.0: TS0046 6-button devices (from Hubitat research)
  '_TZ3000_iszegwpd': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'LoraTap', usesE000: true, productId: 'TS0046', buttonCount: 6
  },
  // v5.8.1: LoraTap TS0043 3-button (GitHub #98 DVMasters)
  '_TZ3000_famkxci2': { 
    appCommandWindow: 1000, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'zcl_only', brand: 'LoraTap', usesE000: true, productId: 'TS0043', buttonCount: 3
  },
  '_TZ3000_nrfkrgf4': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0046', buttonCount: 6
  },
  // v5.8.0: Sonoff SNZB-01 button (from Hubitat research)
  'eWeLink': { 
    appCommandWindow: 800, doubleClickWindow: 400, longPressThreshold: 500,
    protocol: 'zcl_only', brand: 'Sonoff', productId: 'SNZB-01'
  },
  // v5.8.0: Konke button (from Hubitat research)
  'Konke': { 
    appCommandWindow: 1000, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'zcl_only', brand: 'Konke'
  },
  '_TZ3000_tbfw36ye': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes'
  },
  // v5.8.1: Additional E000 cluster devices from Z2M/Hubitat research
  '_TZ3000_w8jwkczz': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0044'
  },
  '_TZ3000_dku2cfsc': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0044'
  },
  '_TZ3000_ja5osu5g': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS004F'
  },
  '_TZ3000_an5rjiwd': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS004F'
  },
  '_TZ3000_nuombroo': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0044'
  },
  '_TZ3000_pcqjmcud': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0044'
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
    requiresExplicitBinding: true,
    perEndpointControl: true  // v5.8.87: Hartmut — fw toggles ALL gangs on single EP cmd
  },
  '_TZ3002_vaq2bfcu': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', brand: 'BSEED', productId: 'TS0726',
    requiresExplicitBinding: true,
    perEndpointControl: true
  },

  // ════════════════════════════════════════════════════════════════════════════
  // HOBEIAN Switches - User reports from forum
  // ════════════════════════════════════════════════════════════════════════════
  'HOBEIAN': { 
    appCommandWindow: 1000, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'HOBEIAN'
  },

  // ════════════════════════════════════════════════════════════════════════════
  // _TZ3000_h1ipgkwn / _TZ3000_iwtv2jwo - TS0002 USB 2-Port Relay + Zigbee Repeater
  // Has physical button (cycle USB ports), clusters 0xE000/0xE001 for moesStartUpOnOff
  // Z2M #23625, #31782: ZCL-only (OnOff EP1 & EP2), mains-powered, NO battery
  // slsys.io: 2-port USB relay with physical button + blue LED
  // ════════════════════════════════════════════════════════════════════════════
  '_TZ3000_h1ipgkwn': { 
    appCommandWindow: 800, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'zcl_only', brand: 'Tuya', productId: 'TS0002', perEndpointControl: true,
    customClusters: [0xE000, 0xE001], usbRelay: true, gangCount: 2
  },
  '_TZ3000_iwtv2jwo': { 
    appCommandWindow: 800, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'zcl_only', brand: 'Tuya', productId: 'TS0002', perEndpointControl: true,
    customClusters: [0xE000, 0xE001], usbRelay: true, gangCount: 2
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Default profile for unknown manufacturers
  // ════════════════════════════════════════════════════════════════════════════
  'default': { 
    appCommandWindow: 500, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'auto', brand: 'Generic'
  }
};

/**
 * v5.13.7: Scene Mode Attribute Constants
 */
const SCENE_MODE_ATTRIBUTE = 0x8004;
const SCENE_MODE_VALUE = 1;

const PhysicalButtonMixin = (SuperClass) => class extends SuperClass {

  /**
   * v5.5.999: Get the last known onoff state for a specific gang
   * @param {number} gang - Gang number (1-based)
   * @returns {boolean|null} Last known state or null if unknown
   */
  getLastOnoffState(gang = 1) {
    return this._physicalButtonState?.[gang]?.lastState ?? null;
  }

  /**
   * v5.5.999: Get all gang states as an object
   * @returns {Object} Object with gang numbers as keys and states as values
   */
  getAllGangStates() {
    const states = {};
    const gangCount = this.gangCount || 1;
    for (let g = 1; g <= gangCount; g++) {
      states[g] = this.getLastOnoffState(g);
    }
    return states;
  }

  /**
   * v5.5.999: Check if an app command is pending for a gang
   * @param {number} gang - Gang number (1-based)
   * @returns {boolean} True if app command is pending
   */
  isAppCommandPending(gang = 1) {
    return this._physicalButtonState?.[gang]?.appCommandPending ?? false;
  }

  /**
   * v5.5.999: Get the last physical button event for a gang
   * @param {number} gang - Gang number (1-based)
   * @returns {Object|null} Last event info or null
   */
  getLastPhysicalEvent(gang = 1) {
    return this._physicalButtonState?.[gang]?.lastPhysicalEvent ?? null;
  }

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
        lastClickTime: 0,
        // v5.5.999: Enhanced state tracking (packetninja pattern)
        lastPhysicalEvent: null,      // { type: 'on'|'off'|'single'|'double'|'long_press'|'triple', timestamp: Date.now() }
        lastAppEvent: null,           // { type: 'on'|'off', timestamp: Date.now() }
        stateHistory: [],             // Last 10 state changes for debugging
        totalPhysicalPresses: 0,      // Counter for diagnostics
        totalAppCommands: 0           // Counter for diagnostics
      };

      // v6.0.0: Restore cumulative metrics from store if available
      const storedMetrics = this.getStoreValue(`physical_metrics_gang${gang}`);
      if (storedMetrics) {
        this._physicalButtonState[gang].totalPhysicalPresses = storedMetrics.totalPhysicalPresses || 0;
        this._physicalButtonState[gang].totalAppCommands = storedMetrics.totalAppCommands || 0;
      }
    }

    // v6.0.0: Persistent Memory Sync Task
    // v8.3.0: Save interval ID for proper cleanup on device deletion
    this._metricsSyncInterval = this.homey.setInterval(() => {
      if (!this._physicalButtonState) {return;}
      for (let gang = 1; gang <= gangCount; gang++) {
        const state = this._physicalButtonState[gang];
        this.setStoreValue(`physical_metrics_gang${gang}`, {
          totalPhysicalPresses: state.totalPhysicalPresses,
          totalAppCommands: state.totalAppCommands,
          lastSync: Date.now()
        }).catch(() => {});
      }
    }, 1000 * 60 * 10); // Every 10 minutes

    // Setup detection for each endpoint
    for (let gang = 1; gang <= gangCount; gang++) {
      await this._setupGangPhysicalDetection(zclNode, gang);
    }

    // v7.0.0: TX/RX Debounce tracking
    this._lastReportTimestamp = 0;
    this._reportDebounceMs = 200; // 200ms debounce for rapid-fire ZCL reports

    this.log(`[PHYSICAL] ✅ Initialized for ${gangCount} gang(s) - SDK 3 Ready`);

    // v5.13.7: Universal Scene Mode Switching (hardened fleet)
    await this.initSceneModeManagement(zclNode);
  }

  /**
   * v5.13.7: Initialize Scene Mode Management
   * Handles auto-switching and recovery for TS004F/TS0044 devices
   */
  async initSceneModeManagement(zclNode) {
    const settings = this.getSettings?.() || {};
    const mode = settings.button_mode || 'auto';
    
    if (mode === 'dimmer') {
      this.log('[PHYSICAL-MODE] ℹ️ Manual Dimmer mode selected, skipping switch');
      return;
    }

    const productId = this.getSetting?.('zb_model_id') || this.getStoreValue?.('zb_model_id') || '';
    const mfr = this.getSetting?.('zb_manufacturer_name') || this.getStoreValue?.('zb_manufacturer_name') || '';

    // Check if device needs mode switching
    const needsSwitch = mode === 'scene' || 
                        productId.includes('TS004F') || 
                        productId.includes('TS0044') ||
                        productId.includes('TS0041') ||
                        productId.includes('TS0042') ||
                        productId.includes('TS0043');

    if (needsSwitch) {
      this.log('[PHYSICAL-MODE] 🔄 Device needs scene mode switching');
      await this._switchToSceneMode(zclNode);
      this._scheduleSceneModeRecovery(zclNode);
    }
  }

  /**
   * v5.13.7: Switch TS004F to Scene Mode
   */
  async _switchToSceneMode(zclNode) {
    const onOffCluster = zclNode?.endpoints?.[1]?.clusters?.onOff || zclNode?.endpoints?.[1]?.clusters?.[6];
    if (!onOffCluster) {return;}

    this.log('[PHYSICAL-MODE] 🔄 Attempting Scene Mode switch (0x8004=1)...');
    
    try {
      if (typeof onOffCluster.writeAttributes === 'function') {
        await onOffCluster.writeAttributes({ [SCENE_MODE_ATTRIBUTE]: SCENE_MODE_VALUE });
        this.log('[PHYSICAL-MODE] ✅ Scene mode set successfully');
        this._lastSceneModeApply = Date.now();
      }
    } catch (err) {
      this.log(`[PHYSICAL-MODE] ⚠️ Mode switch failed: ${err.message}`);
    }
  }

  /**
   * v5.13.7: Periodic scene mode recovery (4h interval)
   */
  _scheduleSceneModeRecovery(zclNode) {
    if (this._sceneRecoveryTimer) {clearInterval(this._sceneRecoveryTimer);}
    
    this._sceneRecoveryTimer = this.homey.setInterval(async () => {
      this.log('[PHYSICAL-MODE] 🔄 Periodic recovery check...');
      await this._switchToSceneMode(zclNode);
    }, 4 * 60 * 60 * 1000);
  }

  /**
   * v5.13.7: Re-apply scene mode on wake (button press)
   */
  async _reapplySceneModeOnWake() {
    const now = Date.now();
    const lastApply = this._lastSceneModeApply || 0;
    
    // Debounce re-application (max once per 10 minutes)
    if (now - lastApply < 10 * 60 * 1000) {return;}

    this.log('[PHYSICAL-MODE] 🔄 Re-applying scene mode on wake...');
    await this._switchToSceneMode(this.zclNode);
  }

  /**
   * v7.0.0: Unified report debounce check
   * Prevents crashes during high-frequency Zigbee bursts
   */
  _isDebounced() {
    const now = Date.now();
    if (now - this._lastReportTimestamp < this._reportDebounceMs) {
      this.log(`[PHYSICAL] 🛡️ Debounce active: skipping report (${now - this._lastReportTimestamp}ms)`);
      return true;
    }
    this._lastReportTimestamp = now;
    return false;
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
   * v9.8.0: DEFENSIVE - Safe flow card trigger helper
   * Guards against missing homey.flow or triggerCard
   */
  _safeTriggerFlow(triggerId, tokens = {}, debug = {}) {
    try {
      if (!this.homey?.flow) {
        this.log(`[PHYSICAL] ⚠️ Cannot trigger flow '${triggerId}': homey.flow unavailable`);
        return Promise.resolve(false);
      }
      const triggerCard = this.homey.flow.getDeviceTriggerCard(triggerId);
      if (typeof triggerCard?.trigger !== 'function') {
        this.log(`[PHYSICAL] ⚠️ Flow '${triggerId}' trigger method unavailable`);
        return Promise.resolve(false);
      }
      return triggerCard.trigger(this, tokens, {})
        .then(() => true)
        .catch(err => {
          this.error(`[PHYSICAL] Flow '${triggerId}' failed: ${err.message}`);
          return false;
        });
    } catch (err) {
      // Flow card not defined for this driver - this is normal for drivers without physical flow cards
      this.log(`[PHYSICAL] ℹ️ Flow card not available: '${triggerId}' (${err.message})`);
      return Promise.resolve(false);
    }
  }

  /**
   * Trigger a physical button flow card
   * v5.5.999: Enhanced with lastPhysicalEvent tracking (packetninja pattern)
   * v9.8.0: DEFENSIVE - Uses _safeTriggerFlow to prevent "getDeviceTriggerCard is not a function"
   */
  _triggerPhysicalFlow(gang, pressType, tokens = {}) {
    const gangCount = this.gangCount || 1;
    const driverId = this.driver?.id || 'switch_1gang';
    
    // v5.5.999: Record last physical event (packetninja pattern)
    const state = this._physicalButtonState?.[gang];
    if (state) {
      state.lastPhysicalEvent = {
        type: pressType,
        timestamp: Date.now(),
        tokens: { ...tokens }
      };
      state.totalPhysicalPresses++;
    }
    
    // Build flow card ID
    let flowCardId;
    if (gangCount === 1) {
      flowCardId = `${driverId}_physical_${pressType}`;
    } else {
      flowCardId = `${driverId}_physical_gang${gang}_${pressType}`;
    }

    this.log(`[PHYSICAL] 🔘 Triggering: ${flowCardId}`);

    // v5.12.5: Scene mode support - v9.8.0: DEFENSIVE
    const sceneMode = typeof this.sceneMode !== 'undefined' ? this.sceneMode : 'auto';
    if ((pressType === 'on' || pressType === 'off') && (sceneMode === 'magic' || sceneMode === 'both' || sceneMode === 'auto')) {
      const sceneCardId = gangCount === 1 
        ? `${driverId  }_gang1_scene` 
        : `${driverId  }_gang${  gang  }_scene`;
      this._safeTriggerFlow(sceneCardId, { action: pressType, gang }, { type: 'scene' });
    }
    if (sceneMode === 'magic' && (pressType === 'on' || pressType === 'off')) {return;}

    // Add gang to tokens
    const flowTokens = { ...tokens, gang };

    // v9.8.0: DEFENSIVE - Use _safeTriggerFlow helper with proper fallback logic
    this._safeTriggerFlow(flowCardId, flowTokens, { pressType, gang }).then(success => {
      // Try fallback to on/off flow cards if this was a single/double/triple press AND the primary card didn't exist/failed
      if (!success && (pressType === 'single' || pressType === 'double' || pressType === 'triple')) {
        const fallbackId = gangCount === 1 
          ? `${driverId}_physical_on`
          : `${driverId}_physical_gang${gang}_on`;
        this._safeTriggerFlow(fallbackId, flowTokens, { type: 'fallback', originalPressType: pressType });
      }
    });
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
   * v5.5.996: Enhanced to support ZCL, Tuya DP, and Hybrid modes
   */
  async _setupGangPhysicalDetection(zclNode, gang) {
    const endpoint = zclNode?.endpoints?.[gang];
    const onOffCluster = endpoint?.clusters?.onOff;
    const profile = this.getDeviceProfile();

    // ════════════════════════════════════════════════════════════════════════
    // ZCL MODE: Listen to onOff cluster attribute reports
    // ════════════════════════════════════════════════════════════════════════
    if (onOffCluster && typeof onOffCluster.on === 'function') {
      onOffCluster.on('attr.onOff', (value) => {
        this._handleAttributeReport(gang, value);
      });

      // Also listen for command responses
      try {
        onOffCluster.on('response', (command, status) => {
          this.log(`[PHYSICAL] Gang ${gang} command response: ${command} = ${status}`);
        });
      } catch (e) { /* ignore if not supported */ }

      this.log(`[PHYSICAL] Gang ${gang} ZCL detection setup complete`);
    } else {
      this.log(`[PHYSICAL] No onOff cluster on EP${gang} - ZCL detection skipped`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // TUYA DP MODE: Listen to Tuya cluster for physical button detection
    // v5.5.996: Support Tuya DP devices (packetninja hybrid support)
    // ════════════════════════════════════════════════════════════════════════
    if (profile.protocol === 'tuya_dp' || profile.protocol === 'hybrid' || profile.protocol === 'auto') {
      this._setupTuyaDPPhysicalDetection(zclNode, gang);
    }
  }


  /**
   * v5.5.996: Setup Tuya DP physical button detection
   * For Tuya DP devices, physical buttons send DP reports
   * We detect physical vs app by checking appCommandPending flag
   */
  _setupTuyaDPPhysicalDetection(zclNode, gang) {
    const endpoint = zclNode?.endpoints?.[1]; // Tuya DP always on EP1
    if (!endpoint?.clusters) {return;}

    // Find Tuya cluster
    const tuyaCluster = endpoint.clusters.tuya ||
      endpoint.clusters.manuSpecificTuya ||
      endpoint.clusters[0xEF00] ||
      endpoint.clusters['61184'];

    if (!tuyaCluster || typeof tuyaCluster.on !== 'function') {
      this.log('[PHYSICAL] No Tuya cluster found - DP detection skipped');
      return;
    }

    // Only setup once (gang 1)
    if (gang !== 1) {return;}

    // Listen for DP reports
    const handleTuyaDP = (data) => {
      if (!data) {return;}
      
      // Parse DP from various formats
      let dpId, value;
      if (data.dp !== undefined) {
        dpId = data.dp;
        value = data.value ?? data.data;
      } else if (data.dpId !== undefined) {
        dpId = data.dpId;
        value = data.value ?? data.data;
      } else if (Buffer.isBuffer(data) && data.length >= 5) {
        dpId = data[2];
        const len = data.readUInt16BE(4);
        if (len === 1) {value = data[6];}
        else if (len === 4) {value = data.readInt32BE(6);}
      }

      if (dpId === undefined) {return;}

      // Map DP to gang (DP1=gang1, DP2=gang2, etc.)
      const gangFromDP = dpId;
      if (gangFromDP >= 1 && gangFromDP <= (this.gangCount || 8)) {
        const boolValue = value === 1 || value === true;
        this._handleTuyaDPReport(gangFromDP, boolValue);
      }
    };

    // Listen to all Tuya event types
    const events = ['dp', 'datapoint', 'response', 'data', 'report'];
    for (const evt of events) {
      try {
        tuyaCluster.on(evt, handleTuyaDP);
      } catch (e) { /* ignore */ }
    }

    this.log(`[PHYSICAL] ✅ Tuya DP physical detection setup for ${this.gangCount || 1} gang(s)`);
  }

  /**
   * v5.5.996: Handle Tuya DP report for physical button detection
   */
  _handleTuyaDPReport(gang, value) {
    const state = this._physicalButtonState?.[gang];
    if (!state) {return;}

    // v7.0.0: RX Debounce check
    if (this._isDebounced()) {return;}

    const now = Date.now();
    const isPhysical = !state.appCommandPending;

    // v5.11.19: CRITICAL FIX - Skip if state hasn't changed (curtain_motor false→false spam)
    // Same guard as _handleAttributeReport — periodic DP reports with unchanged value are NOT button presses
    if (state.lastState === value) {
      this.log(`[PHYSICAL-DP] Gang ${gang}: ${value} unchanged - skipping (periodic DP report)`);
      return;
    }

    this.log(`[PHYSICAL-DP] Gang ${gang}: ${state.lastState} → ${value} (${isPhysical ? 'PHYSICAL' : 'APP'})`);

    // Update state
    const previousState = state.lastState;
    state.lastState = value;

    // Only process physical button presses
    if (!isPhysical) {return;}

    // Detect press type (same logic as ZCL)
    if (value === true) {
      // Button pressed ON - start tracking
      state.pressStartTime = now;
      state.clickCount++;
      
      if (state.clickTimeout) {
        clearTimeout(state.clickTimeout);
      }

      state.clickTimeout = setTimeout(() => {
        this._finalizeClickDetection(gang);
      }, this._timingProfile.doubleClickWindow);

    } else if (value === false && state.pressStartTime) {
      const pressDuration = now - state.pressStartTime;
      
      if (pressDuration >= this._timingProfile.longPressThreshold) {
        this._triggerPhysicalFlow(gang, 'long_press', { duration: pressDuration });
        state.clickCount = 0;
        if (state.clickTimeout) {
          clearTimeout(state.clickTimeout);
          state.clickTimeout = null;
        }
      }
      
      state.pressStartTime = null;
    }

    // v5.11.18: Only trigger on/off flow when state actually changed (fixes curtain_motor false→false spam)
    if (previousState !== value) {
      this._triggerPhysicalFlow(gang, value ? 'on' : 'off', {});

      // v5.13.7: Re-apply scene mode on wake
      if (value === true && typeof this._reapplySceneModeOnWake === 'function') {
        this._reapplySceneModeOnWake().catch(() => {});
      }
    }
  }

  /**
   * Handle attribute report from device (indicates state change)
   * v5.5.999: Enhanced with state history tracking (packetninja pattern)
   * v5.8.12: CYRIL FORUM FIX - Skip triggering when state hasn't changed (prevents 10min notifications)
   */
  _handleAttributeReport(gang, value) {
    const state = this._physicalButtonState?.[gang];
    if (!state) {return;}

    // v7.0.0: ZCL RX Debounce check
    if (this._isDebounced()) {return;}

    const now = Date.now();
    const isPhysical = !state.appCommandPending;

    // v5.8.12: CRITICAL FIX - Skip if state hasn't changed (periodic reports with same value)
    // This prevents false physical button triggers from attribute polling/reporting
    const previousState = state.lastState;
    if (previousState === value) {
      // State unchanged - this is just a periodic report, NOT a button press
      this.log(`[PHYSICAL] Gang ${gang}: ${value} unchanged - skipping (periodic report)`);
      return;
    }

    this.log(`[PHYSICAL] Gang ${gang}: ${previousState} → ${value} (${isPhysical ? 'PHYSICAL' : 'APP'})`);

    // Update state
    state.lastState = value;

    // v5.5.999: Record state change in history (keep last 10)
    state.stateHistory.push({
      from: previousState,
      to: value,
      timestamp: now,
      source: isPhysical ? 'physical' : 'app'
    });
    if (state.stateHistory.length > 10) {
      state.stateHistory.shift();
    }

    // Only process physical button presses
    if (!isPhysical) {return;}

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

    // v5.11.18: Only trigger on/off flow when state actually changed
    if (previousState !== value) {
      this._triggerPhysicalFlow(gang, value ? 'on' : 'off', {});

      // v5.13.7: Re-apply scene mode on wake
      if (value === true && typeof this._reapplySceneModeOnWake === 'function') {
        this._reapplySceneModeOnWake().catch(() => {});
      }
    }
  }

  /**
   * Finalize click detection after timeout
   */
  _finalizeClickDetection(gang) {
    const state = this._physicalButtonState?.[gang];
    if (!state) {return;}
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
   * Mark that an app command was sent (to distinguish from physical)
   * Call this before sending any command to the device
   * v5.5.999: Enhanced with lastAppEvent tracking (packetninja pattern)
   * @param {number} gang - Gang number (1-based)
   * @param {boolean} value - The value being sent (true=on, false=off)
   */
  markAppCommand(gang = 1, value = null) {
    const state = this._physicalButtonState?.[gang];
    if (!state) {return;}

    state.appCommandPending = true;
    
    // v5.5.999: Record last app event (packetninja pattern)
    state.lastAppEvent = {
      type: value === true ? 'on' : value === false ? 'off' : 'unknown',
      timestamp: Date.now(),
      value: value
    };
    state.totalAppCommands++;
    
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
   * v8.1.0: Also clears scene recovery timer to prevent memory leaks
   */
  _cleanupPhysicalButtonDetection() {
    if (!this._physicalButtonState) {return;}

    for (const [gang, state] of Object.entries(this._physicalButtonState)) {
      if (state.appCommandTimeout) {clearTimeout(state.appCommandTimeout);}
      if (state.clickTimeout) {clearTimeout(state.clickTimeout);}
    }
    
    // v8.1.0: Clear scene mode recovery timer
    if (this._sceneRecoveryTimer) {
      this.homey.clearInterval(this._sceneRecoveryTimer);
      this._sceneRecoveryTimer = null;
    }

    // v8.3.0: Clear metrics sync interval (memory leak fix)
    if (this._metricsSyncInterval) {
      this._metricsSyncInterval.clear();
      this._metricsSyncInterval = null;
    }

    this._physicalButtonState = null;
    this.log('[PHYSICAL] Cleanup complete');
  }

  async onDeleted() {
    this._cleanupPhysicalButtonDetection();
    if (super.onDeleted) { await super.onDeleted(); }
  }

  /**
   * v8.1.0: SDK3 onUninit() — called on app restart/update
   * Prevents interval leaks when app restarts without device deletion
   */
  async onUninit() {
    this._cleanupPhysicalButtonDetection();
    if (super.onUninit) { await super.onUninit(); }
  }
};

module.exports = PhysicalButtonMixin;
