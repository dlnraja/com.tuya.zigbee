'use strict';
const CI = require('../utils/CaseInsensitiveMatcher');

const { CLUSTERS } = require('../constants/ZigbeeConstants.js');


/**
 * 
 *    PhysicalButtonMixin v5.5.999 - Advanced Physical Button Detection         
 * 
 *   Detects physical button presses vs app commands with support for:          
 *   - Single press                                                              
 *   - Double press                                                              
 *   - Long press (hold)                                                         
 *   - Triple press                                                              
 *   Manufacturer-specific timing profiles (BSEED=2000ms, default=500ms)        
 *   v5.5.999: Enhanced state tracking for all buttons (packetninja pattern)    
 * 
 */

/**
 * 
 *    MANUFACTURER-SPECIFIC DEVICE PROFILES                                      
 *    Based on Z2M, ZHA research and user feedback from forum                    
 * 
 *    Sources:                                                                   
 *    - Z2M #14523: TS0003 individual channel issue                              
 *    - ZHA #2443: TS0003/TS0004 group toggle bug (0xE000/0xE001 clusters)       
 *    - Forum: BSEED, Zemismart, Moes switches user reports                      
 *    - PR #116: packetninja BSEED physical button detection                     
 * 
 */
const DEVICE_PROFILES = {
  // 
  // BSEED Switches - Use ZCL only, clusters 0xE000/0xE001, slow response
  // From: PR #116, forum diagnostics, Blakadder database
  // 
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

  // 
  // Zemismart Switches - Similar to BSEED, have 0xE000/0xE001 clusters
  // ZHA #2443: "all gangs toggle together" bug - needs per-endpoint control
  // 
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

  // 
  // Moes Switches - Various timing requirements per user feedback
  // Forum: Freddyboy _TZ3000_zgyzgdua scene switch issues
  // 
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

  // 
  // Lonsonho/Tuya Generic - Standard timing, Tuya DP protocol
  // 
  '_TZ3000_cfnprab5': { 
    appCommandWindow: 500, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'tuya_dp', brand: 'Lonsonho'
  },
  '_TZ3000_vjhcxkzb': { 
    appCommandWindow: 500, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'tuya_dp', brand: 'Lonsonho'
  },

  // 
  // TS0726 - BSEED 4-gang with special bindings (Hartmut_Dunker forum)
  // Needs explicit onOff cluster binding per endpoint
  // 
  '_TZ3002_pzao9ls1': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', brand: 'BSEED', productId: 'TS0726',
    requiresExplicitBinding: true,
    perEndpointControl: true  // v5.8.87: Hartmut reporting fw toggles ALL gangs on single EP cmd
  },
  '_TZ3002_vaq2bfcu': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', brand: 'BSEED', productId: 'TS0726',
    requiresExplicitBinding: true,
    perEndpointControl: true
  },

  // 
  // HOBEIAN Switches - User reports from forum
  // 
  'HOBEIAN': { 
    appCommandWindow: 1000, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'HOBEIAN'
  },

  // 
  // Default profile for unknown manufacturers
  // 
  'default': { 
    appCommandWindow: 500, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'auto', brand: 'Generic'
  }
};

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
      this.log('[PHYSICAL]  Physical button detection DISABLED in settings');
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
    }

    // Setup detection for each endpoint
    for (let gang = 1; gang <= gangCount; gang++) {
      await this._setupGangPhysicalDetection(zclNode, gang);
    }

    // v7.0.0: TX/RX Debounce tracking
    this._lastReportTimestamp = 0;
    this._reportDebounceMs = 200; // 200ms debounce for rapid-fire ZCL reports

    this.log(`[PHYSICAL]  Initialized for ${gangCount} gang(s) - SDK 3 Ready`);
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
      if (!CI.equalsCI(mfr, 'default') && manufacturerName.toLowerCase().includes(mfr.toLowerCase())) {
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
   * v5.5.996: Enhanced to support ZCL, Tuya DP, and Hybrid modes
   */
  async _setupGangPhysicalDetection(zclNode, gang) {
    const endpoint = zclNode?.endpoints?.[gang];
    const onOffCluster = endpoint?.clusters?.onOff;
    const profile = this.getDeviceProfile();

    // 
    // ZCL MODE: Listen to onOff cluster attribute reports
    // 
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

    // 
    // TUYA DP MODE: Listen to Tuya cluster for physical button detection
    // v5.5.996: Support Tuya DP devices (packetninja hybrid support)
    // 
    if (profile.protocol === 'tuya_dp' || profile.protocol === 'hybrid' || profile.protocol === 'auto') {
      this._setupTuyaDPPhysicalDetection(zclNode, gang);
    }
  }

  /**
   * v7.0.0: Unified report debounce check
   * Prevents crashes during high-frequency Zigbee bursts
   */
  _isDebounced() {
    const now = Date.now();
    if (now - this._lastReportTimestamp < this._reportDebounceMs) {
      this.log(`[PHYSICAL]  Debounce active: skipping report (${now - this._lastReportTimestamp}ms)`);
      return true;
    }
    this._lastReportTimestamp = now;
    return false;
  }

  /**
   * v5.5.996: Setup Tuya DP physical button detection
   * For Tuya DP devices, physical buttons send DP reports
   * We detect physical vs app by checking appCommandPending flag
   */
  _setupTuyaDPPhysicalDetection(zclNode, gang) {
    const endpoint = zclNode?.endpoints?.[1]; // Tuya DP always on EP1
    if (!endpoint?.clusters) return;

    // Find Tuya cluster
    const tuyaCluster = endpoint.clusters.tuya ||
      endpoint.clusters.manuSpecificTuya ||
      endpoint.clusters[CLUSTERS.TUYA_EF00] ||
      endpoint.clusters['61184'];

    if (!tuyaCluster || typeof tuyaCluster.on !== 'function') {
      this.log('[PHYSICAL] No Tuya cluster found - DP detection skipped');
      return;
    }

    // Only setup once (gang 1)
    if (gang !== 1) return;

    // Listen for DP reports
    const handleTuyaDP = (data) => {
      if (!data) return;
      
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
        if (len === 1) value = data[6];
        else if (len === 4) value = data.readInt32BE(6);
      }

      if (dpId === undefined) return;

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

    this.log(`[PHYSICAL]  Tuya DP physical detection setup for ${this.gangCount || 1} gang(s)`);
  }

  /**
   * v5.5.996: Handle Tuya DP report for physical button detection
   */
  _handleTuyaDPReport(gang, value) {
    const state = this._physicalButtonState?.[gang];
    if (!state) return;

    // v7.0.0: RX Debounce check
    if (this._isDebounced()) return;

    const now = Date.now();
    const isPhysical = !state.appCommandPending;

    // v5.11.19: CRITICAL FIX - Skip if state hasn't changed (curtain_motor false/false spam)
    // Same guard as _handleAttributeReport - periodic DP reports with unchanged value are NOT button presses
    if (state.lastState === value) {
      this.log(`[PHYSICAL-DP] Gang ${gang}: ${value} unchanged - skipping (periodic DP report)`);
      return;
    }

    this.log(`[PHYSICAL-DP] Gang ${gang}: ${state.lastState} -> ${value} (${isPhysical ? 'PHYSICAL' : 'APP'})`);

    // Update state
    const previousState = state.lastState;
    state.lastState = value;

    // Only process physical button presses
    if (!isPhysical) return;

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

    // v5.11.18: Only trigger on/off flow when state actually changed (fixes curtain_motor false/false spam)
    if (previousState !== value) {
      this._triggerPhysicalFlow(gang, value ? 'on' : 'off', {});
    }
  }

  /**
   * Handle attribute report from device (indicates state change)
   * v5.5.999: Enhanced with state history tracking (packetninja pattern)
   * v5.8.12: CYRIL FORUM FIX - Skip triggering when state hasn't changed (prevents 10min notifications)
   */
  _handleAttributeReport(gang, value) {
    const state = this._physicalButtonState?.[gang];
    if (!state) return;

    // v7.0.0: ZCL RX Debounce check
    if (this._isDebounced()) return;

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

    this.log(`[PHYSICAL] Gang ${gang}: ${previousState} -> ${value} (${isPhysical ? 'PHYSICAL' : 'APP'})`);

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

    // v5.11.18: Only trigger on/off flow when state actually changed
    if (previousState !== value) {
      this._triggerPhysicalFlow(gang, value ? 'on' : 'off', {});
    }
  }

  /**
   * Finalize click detection after timeout
   */
  _finalizeClickDetection(gang) {
    const state = this._physicalButtonState?.[gang];
    if (!state) return;
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
   * v5.5.999: Enhanced with lastPhysicalEvent tracking (packetninja pattern)
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
    
    // v7.0.28: Candidate ID Set (Issue #170 Robustness)
    // Supports ALL historical and current naming patterns for Flow cards
    const candidates = new Set();
    const id = driverId;

    if (gangCount === 1) {
      candidates.add(`${id}_physical_${pressType}`);
      candidates.add(`${id}_${pressType}`); // Legacy fallback
    } else {
      // 1. Primary: Standard "physical_gangX" pattern
      candidates.add(`${id}_physical_gang${gang}_${pressType}`);
      
      // 2. Alternate: "gangX_physical" pattern
      candidates.add(`${id}_gang${gang}_physical_${pressType}`);
      
      // 3. Action-oriented: "gangX_turned_on" pattern (matches CoreCapabilityMixin)
      if (pressType === 'on' || pressType === 'off') {
        candidates.add(`${id}_gang${gang}_turned_${pressType}`);
      }
      
      // 4. Compact: "gangX_on" pattern
      candidates.add(`${id}_gang${gang}_${pressType}`);
    }

    this.log(`[PHYSICAL]  Triggering physical event: ${pressType} (gang ${gang})`);

    // v7.0.26: RULE 21 INTEROPERABILITY LAYER
    // Trigger universal card if available
    try {
      const universalCard = this.homey.app?._safeGetTriggerCard?.('action_button_pressed');
      if (universalCard) {
        universalCard.trigger(this, { ...tokens, action: pressType, gang, capability: gang === 1 ? 'onoff' : `onoff.gang${gang}` }, {}).catch(() => {});
        this.log('[PHYSICAL]  Rule 21 Universal Trigger Sent');
      }
    } catch (e) {}

    // v5.12.5: Scene mode support
    const sceneMode = typeof this.sceneMode !== 'undefined' ? this.sceneMode : 'auto';
    if ((pressType === 'on' || pressType === 'off') && (sceneMode === 'magic' || sceneMode === 'both' || sceneMode === 'auto')) {
      const sceneCardId = gangCount === 1 ? driverId + '_gang1_scene' : driverId + '_gang' + gang + '_scene';
      try {
        const sceneCard = this.homey.app?._safeGetTriggerCard?.(sceneCardId);
        if (sceneCard) {
          sceneCard.trigger(this, { action: pressType, gang }, {}).catch(err => this.log(`[PHYSICAL] Scene trigger failed: ${err.message}`));
          this.log('[PHYSICAL] Scene triggered: ' + sceneCardId);
        }
      } catch (e) { /* scene card not defined for this driver */ }
    }
    if (sceneMode === 'magic' && (pressType === 'on' || pressType === 'off')) return;

    // Add gang to tokens
    const flowTokens = { ...tokens, gang };

    // Try all candidates until one succeeds
    let triggered = false;
    for (const flowCardId of candidates) {
      try {
        const flowCard = this.homey.app?._safeGetTriggerCard?.(flowCardId);
        if (flowCard) {
          flowCard.trigger(this, flowTokens, {})
            .catch(err => this.log(`[PHYSICAL]  Trigger error for ${flowCardId}: ${err.message}`));
          this.log(`[PHYSICAL]  Flow triggered: ${flowCardId}`);
          triggered = true;
          break; // Stop after first success
        }
      } catch (err) {
        // Silently continue to next candidate
      }
    }

    if (!triggered) {
      this.log(`[PHYSICAL]  No matching flow card found in candidates: ${Array.from(candidates).join(', ')}`);
      
      // Legacy fallback for press types (if no specific card exists, try general "on" card)
      if (pressType === 'single' || pressType === 'double' || pressType === 'triple') {
        const fallbackId = gangCount === 1 ? `${id}_physical_on` : `${id}_physical_gang${gang}_on`;
        this.homey.app?._safeGetTriggerCard?.(fallbackId)?.trigger(this, flowTokens, {}).catch(() => {});
      }
    }
  }

  /**
   * Mark that an app command was sent (to distinguish from physical)
   * Call this before sending any command to the device
   * v5.5.999: Enhanced with lastAppEvent tracking (packetninja pattern)
   * @param {number} gang - Gang number (1-based)
   * @param {boolean} value - The value being sent (true = on, false=off)
   */
  markAppCommand(gang = 1, value = null) {
    const state = this._physicalButtonState?.[gang];
    if (!state) return;

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
