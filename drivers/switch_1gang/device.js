'use strict';
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      1-GANG SWITCH - v5.5.897 UNIFIED + BSEED Special Mode                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  STANDARD MODE (all other 1-gang switches):                                 ║
 * ║  - HybridSwitchBase: Tuya DP + ZCL hybrid                                   ║
 * ║  - PhysicalButtonMixin: 500ms response window (fast)                        ║
 * ║  - Energy monitoring DPs 17-20                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  BSEED MODE (_TZ3000_blhvsaqf, _TZ3000_ysdv91bk):                           ║
 * ║  - Custom clusters 0xE000 (57344) + 0xE001 (57345)                          ║
 * ║  - Standard ZCL onOff (cluster 6) - NOT Tuya DP                             ║
 * ║  - 2000ms app command window (slower device response)                       ║
 * ║  - Dedicated physical button detection via attribute reports                ║
 * ║  - PR #116 by packetninja - Full feature parity                             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * ZCL-Only manufacturers that should NOT use Tuya DP protocol
 * Based on Z2M, ZHA research and forum feedback:
 * - BSEED: Uses clusters 0xE000/0xE001
 * - Zemismart: Same as BSEED, "all gangs toggle" bug fixed with per-endpoint
 * - TS0726: BSEED 4-gang needs explicit binding
 */
const ZCL_ONLY_MANUFACTURERS = [
  // BSEED (PR #116, Blakadder, forum diagnostics)
  '_TZ3000_blhvsaqf', '_TZ3000_ysdv91bk', '_TZ3000_hafsqare', 
  '_TZ3000_e98krvvk', '_TZ3000_iedbgyxt',
  // Zemismart (ZHA #2443)
  '_TZ3000_a37eix1s', '_TZ3000_empogkya', '_TZ3000_18ejxrzk',
  // TS0726 BSEED 4-gang (Hartmut_Dunker)
  '_TZ3002_pzao9ls1', '_TZ3002_vaq2bfcu'
];

class Switch1GangDevice extends PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase)) {

  get gangCount() { return 1; }

  /**
   * Check if this device requires ZCL-only mode (no Tuya DP)
   * Multiple fallback sources for manufacturer name detection
   */
  get isZclOnlyDevice() {
    // Get manufacturer name from multiple sources (some may not be available at init)
    const mfr = this.getSetting?.('zb_manufacturer_name') || 
                this.getStoreValue?.('zb_manufacturer_name') ||
                this.getStoreValue?.('manufacturerName') ||
                this.zclNode?.endpoints?.[1]?.clusters?.basic?.attributes?.manufacturerName ||
                '';
    
    const isZclOnly = ZCL_ONLY_MANUFACTURERS.some(b => 
      mfr.toLowerCase().includes(b.toLowerCase())
    );
    
    // Log for debugging
    if (this._zclOnlyCheckLogged !== mfr) {
      this._zclOnlyCheckLogged = mfr;
      this.log(`[SWITCH-1G] Manufacturer: "${mfr}" → ZCL-only: ${isZclOnly}`);
    }
    
    return isZclOnly;
  }

  /**
   * Get device brand for logging
   */
  get deviceBrand() {
    const profile = this.getDeviceProfile?.() || {};
    return profile.brand || 'Generic';
  }

  /**
   * EXTEND parent dpMappings with energy monitoring DPs
   * ZCL-only devices (BSEED, Zemismart) don't use Tuya DP
   */
  get dpMappings() {
    // ZCL-only devices: Skip Tuya DP mappings entirely
    if (this.isZclOnlyDevice) {
      return {}; // No Tuya DP for ZCL-only devices
    }
    
    const parentMappings = Object.getPrototypeOf(Object.getPrototypeOf(this)).dpMappings || {};
    return {
      ...parentMappings,
      17: { capability: 'measure_current', divisor: 1000, unit: 'A' },
      18: { capability: 'measure_power', divisor: 10, unit: 'W' },
      19: { capability: 'measure_voltage', divisor: 10, unit: 'V' },
      20: { capability: 'meter_power', divisor: 100, unit: 'kWh' }
    };
  }

  async onNodeInit({ zclNode }) {
    // Get device profile for brand-specific handling
    const profile = this.getDeviceProfile?.() || {};
    const isZclOnly = this.isZclOnlyDevice;
    
    if (isZclOnly) {
      // ════════════════════════════════════════════════════════════════════════
      // ZCL-ONLY MODE (BSEED, Zemismart, etc.)
      // Uses ZCL onOff only (no Tuya DP), may have custom clusters 0xE000/0xE001
      // Sources: PR #116, ZHA #2443, forum reports
      // ════════════════════════════════════════════════════════════════════════
      this.log(`[SWITCH-1G] 🔵 ZCL-ONLY MODE: ${profile.brand || 'Unknown'}`);
      await this._initZclOnlyMode(zclNode, profile);
    } else {
      // ════════════════════════════════════════════════════════════════════════
      // STANDARD MODE - Tuya DP + ZCL hybrid
      // ════════════════════════════════════════════════════════════════════════
      await super.onNodeInit({ zclNode });
      await this.initPhysicalButtonDetection(zclNode);
      await this.initVirtualButtons();
      this.log(`[SWITCH-1G] v5.5.899 STANDARD - ${profile.brand || 'Hybrid'} Tuya DP + ZCL`);
    }
  }

  /**
   * ════════════════════════════════════════════════════════════════════════════
   * ZCL-ONLY MODE INITIALIZATION
   * For: BSEED, Zemismart, and other devices that don't use Tuya DP
   * Sources: PR #116, ZHA #2443, Z2M #14523, forum reports
   * Features:
   * - Standard ZCL onOff control (cluster 6) per endpoint
   * - Custom clusters 0xE000 (57344) and 0xE001 (57345) if present
   * - Physical button detection via attribute reports
   * - Configurable timeout window (brand-specific defaults)
   * ════════════════════════════════════════════════════════════════════════════
   */
  async _initZclOnlyMode(zclNode, profile = {}) {
    const brand = profile.brand || 'ZCL-Only';
    this.log(`[${brand}] Initializing ${brand} 1-Gang Switch...`);
    this.printNode?.();

    // ZCL-only state tracking
    this._zclOnlyState = {
      brand,
      profile,
      lastOnoffState: null,
      appCommandPending: false,
      appCommandTimeout: null
    };

    // Register onoff with pure ZCL (no Tuya DP)
    await this._setupZclOnlyOnOff(zclNode, profile);

    // Setup custom clusters (0xE000, 0xE001) if device has them
    if (profile.customClusters?.length > 0) {
      await this._setupCustomClusters(zclNode, profile);
    }

    // Initialize virtual buttons (optional features)
    await this.initVirtualButtons?.();

    this.log(`[${brand}] ✅ Ready - ZCL onOff + physical detection (window: ${profile.appCommandWindow}ms)`);
  }

  /**
   * ZCL-Only: Setup ZCL onOff with physical button detection
   */
  async _setupZclOnlyOnOff(zclNode, profile = {}) {
    const brand = profile.brand || 'ZCL';
    const endpoint = zclNode?.endpoints?.[1];
    const onOffCluster = endpoint?.clusters?.onOff;

    if (!onOffCluster) {
      this.error(`[${brand}] No onOff cluster on EP1!`);
      return;
    }

    // Listen for attribute reports (physical button presses)
    if (typeof onOffCluster.on === 'function') {
      onOffCluster.on('attr.onOff', (value) => {
        this.log(`[${brand}] 📥 Attribute report: onOff = ${value}`);
        this._handleZclOnlyOnOffChange(value, !this._zclOnlyState.appCommandPending);
      });
      this.log(`[${brand}] ✅ Attribute report listener registered`);
    }

    // Register capability listener for app commands
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`[${brand}] 📤 App command: onOff = ${value}`);
      this._markZclOnlyAppCommand();
      
      try {
        await onOffCluster[value ? 'setOn' : 'setOff']();
        this.log(`[${brand}] ✅ ZCL command sent: ${value ? 'ON' : 'OFF'}`);
        return true;
      } catch (e) {
        this.error(`[${brand}] ZCL command failed: ${e.message}`);
        throw e;
      }
    });
  }

  /**
   * ZCL-Only: Handle onOff state changes and trigger physical button flows
   */
  _handleZclOnlyOnOffChange(value, isPhysical) {
    const state = this._zclOnlyState;
    const brand = state?.brand || 'ZCL';
    
    if (state.lastOnoffState !== value) {
      this.log(`[${brand}] State: ${state.lastOnoffState} → ${value} (${isPhysical ? 'PHYSICAL' : 'APP'})`);
      state.lastOnoffState = value;

      // Update capability
      this.setCapabilityValue('onoff', value).catch(() => {});

      // Trigger flow cards ONLY for physical button presses
      if (isPhysical) {
        // Basic on/off physical flow
        const basicFlowId = value ? 'switch_1gang_physical_on' : 'switch_1gang_physical_off';
        this.homey.flow.getDeviceTriggerCard(basicFlowId)
          .trigger(this, {}, {})
          .catch(err => this.log(`[${brand}] Flow error: ${err.message}`));

        // Also trigger single press
        this.homey.flow.getDeviceTriggerCard('switch_1gang_physical_single')
          .trigger(this, {}, {})
          .catch(() => {});

        this.log(`[${brand}] 🔘 Physical button ${value ? 'ON' : 'OFF'} triggered`);
      }
    }
  }

  /**
   * ZCL-Only: Mark app command (configurable timeout from profile/settings)
   */
  _markZclOnlyAppCommand() {
    const state = this._zclOnlyState;
    const brand = state?.brand || 'ZCL';
    state.appCommandPending = true;
    
    if (state.appCommandTimeout) clearTimeout(state.appCommandTimeout);
    
    // Get timeout from settings or use profile default
    const timeout = this.getSetting?.('app_command_timeout') || state.profile?.appCommandWindow || 2000;
    
    state.appCommandTimeout = setTimeout(() => {
      state.appCommandPending = false;
      this.log(`[${brand}] App command window closed`);
    }, timeout);
  }

  /**
   * ZCL-Only: Setup custom clusters (0xE000, 0xE001, etc.)
   * Used by BSEED, Zemismart and similar devices
   */
  async _setupCustomClusters(zclNode, profile = {}) {
    const brand = profile.brand || 'ZCL';
    const endpoint = zclNode?.endpoints?.[1];
    const customClusters = profile.customClusters || [0xE000, 0xE001];
    
    for (const clusterId of customClusters) {
      const cluster = endpoint?.clusters?.[clusterId] || endpoint?.clusters?.[String(clusterId)];
      if (cluster) {
        this.log(`[${brand}] ✅ Custom cluster 0x${clusterId.toString(16).toUpperCase()} (${clusterId}) found`);
        if (typeof cluster.on === 'function') {
          cluster.on('attr', (attrId, value) => {
            this.log(`[${brand}] 0x${clusterId.toString(16).toUpperCase()} attr ${attrId}: ${JSON.stringify(value)}`);
          });
        }
      }
    }
  }

  /**
   * Override for standard mode only
   */
  async _registerCapabilityListeners() {
    if (this.isZclOnlyDevice) return; // ZCL-only devices have their own listener
    
    await super._registerCapabilityListeners?.();
    this.registerCapabilityListener('onoff', async (value) => {
      this.markAppCommand(1);
      return this._setGangState?.(1, value) || this._setOnOff?.(value);
    });
  }

  onDeleted() {
    // ZCL-only cleanup
    if (this._zclOnlyState?.appCommandTimeout) {
      clearTimeout(this._zclOnlyState.appCommandTimeout);
    }
    super.onDeleted?.();
    this.log('[SWITCH-1G] Device removed');
  }
}

module.exports = Switch1GangDevice;
