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

// BSEED manufacturer names (PR #116)
const BSEED_MANUFACTURERS = [
  '_TZ3000_blhvsaqf',
  '_TZ3000_ysdv91bk',
  '_tz3000_blhvsaqf',
  '_tz3000_ysdv91bk'
];

class Switch1GangDevice extends PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase)) {

  get gangCount() { return 1; }

  /**
   * Check if this is a BSEED device
   */
  get isBseedDevice() {
    const mfr = this.getSetting?.('zb_manufacturer_name') || 
                this.getStoreValue?.('manufacturerName') || '';
    return BSEED_MANUFACTURERS.some(b => mfr.toLowerCase().includes(b.toLowerCase()));
  }

  /**
   * EXTEND parent dpMappings with energy monitoring DPs
   * BSEED devices don't use Tuya DP - they use pure ZCL
   */
  get dpMappings() {
    // BSEED: Skip Tuya DP mappings entirely
    if (this.isBseedDevice) {
      return {}; // No Tuya DP for BSEED
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
    // Detect BSEED early
    const isBseed = this.isBseedDevice;
    
    if (isBseed) {
      // ════════════════════════════════════════════════════════════════════════
      // BSEED MODE - PR #116 by packetninja
      // Uses ZCL onOff only (no Tuya DP), custom clusters 0xE000/0xE001
      // ════════════════════════════════════════════════════════════════════════
      this.log('[SWITCH-1G] 🔵 BSEED MODE ACTIVATED');
      await this._initBseedMode(zclNode);
    } else {
      // ════════════════════════════════════════════════════════════════════════
      // STANDARD MODE - Tuya DP + ZCL hybrid
      // ════════════════════════════════════════════════════════════════════════
      await super.onNodeInit({ zclNode });
      await this.initPhysicalButtonDetection(zclNode);
      await this.initVirtualButtons();
      this.log('[SWITCH-1G] v5.5.897 STANDARD - Hybrid Tuya DP + ZCL');
    }
  }

  /**
   * ════════════════════════════════════════════════════════════════════════════
   * BSEED SPECIFIC INITIALIZATION (PR #116)
   * Features:
   * - Standard ZCL onOff control (cluster 6)
   * - Custom Bseed clusters 0xE000 (57344) and 0xE001 (57345)
   * - Physical button detection via attribute reports
   * - 2-second timeout window for app vs physical detection
   * ════════════════════════════════════════════════════════════════════════════
   */
  async _initBseedMode(zclNode) {
    this.log('[BSEED] Initializing BSEED 1-Gang Switch...');
    this.printNode?.();

    // BSEED-specific state tracking
    this._bseedState = {
      lastOnoffState: null,
      appCommandPending: false,
      appCommandTimeout: null
    };

    // Register onoff with pure ZCL (no Tuya DP)
    await this._setupBseedOnOff(zclNode);

    // Setup BSEED custom clusters (0xE000, 0xE001)
    await this._setupBseedCustomClusters(zclNode);

    // Initialize virtual buttons (optional features)
    await this.initVirtualButtons?.();

    this.log('[BSEED] ✅ BSEED mode ready - ZCL onOff + physical detection');
  }

  /**
   * BSEED: Setup ZCL onOff with physical button detection
   */
  async _setupBseedOnOff(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    const onOffCluster = endpoint?.clusters?.onOff;

    if (!onOffCluster) {
      this.error('[BSEED] No onOff cluster on EP1!');
      return;
    }

    // Listen for attribute reports (physical button presses)
    if (typeof onOffCluster.on === 'function') {
      onOffCluster.on('attr.onOff', (value) => {
        this.log(`[BSEED] 📥 Attribute report: onOff = ${value}`);
        this._handleBseedOnOffChange(value, !this._bseedState.appCommandPending);
      });
      this.log('[BSEED] ✅ Attribute report listener registered');
    }

    // Register capability listener for app commands
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`[BSEED] 📤 App command: onOff = ${value}`);
      this._markBseedAppCommand();
      
      try {
        await onOffCluster[value ? 'setOn' : 'setOff']();
        this.log(`[BSEED] ✅ ZCL command sent: ${value ? 'ON' : 'OFF'}`);
        return true;
      } catch (e) {
        this.error(`[BSEED] ZCL command failed: ${e.message}`);
        throw e;
      }
    });
  }

  /**
   * BSEED: Handle onOff state changes and trigger physical button flows
   */
  _handleBseedOnOffChange(value, isPhysical) {
    const state = this._bseedState;
    
    if (state.lastOnoffState !== value) {
      this.log(`[BSEED] State: ${state.lastOnoffState} → ${value} (${isPhysical ? 'PHYSICAL' : 'APP'})`);
      state.lastOnoffState = value;

      // Update capability
      this.setCapabilityValue('onoff', value).catch(() => {});

      // Trigger flow cards ONLY for physical button presses
      if (isPhysical) {
        // Basic on/off physical flow
        const basicFlowId = value ? 'switch_1gang_physical_on' : 'switch_1gang_physical_off';
        this.homey.flow.getDeviceTriggerCard(basicFlowId)
          .trigger(this, {}, {})
          .catch(err => this.log(`[BSEED] Flow error: ${err.message}`));

        // Also trigger single press (BSEED doesn't support double/long detection natively)
        this.homey.flow.getDeviceTriggerCard('switch_1gang_physical_single')
          .trigger(this, {}, {})
          .catch(() => {});

        this.log(`[BSEED] 🔘 Physical button ${value ? 'ON' : 'OFF'} triggered`);
      }
    }
  }

  /**
   * BSEED: Mark app command (configurable timeout, default 2000ms)
   */
  _markBseedAppCommand() {
    const state = this._bseedState;
    state.appCommandPending = true;
    
    if (state.appCommandTimeout) clearTimeout(state.appCommandTimeout);
    
    // Get timeout from settings or use BSEED default (2000ms)
    const timeout = this.getSetting?.('app_command_timeout') || 2000;
    
    state.appCommandTimeout = setTimeout(() => {
      state.appCommandPending = false;
      this.log('[BSEED] App command window closed');
    }, timeout);
  }

  /**
   * BSEED: Setup custom clusters 0xE000 and 0xE001
   * These are proprietary Bseed clusters for extended functionality
   */
  async _setupBseedCustomClusters(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    
    // Cluster 0xE000 (57344) - Bseed proprietary
    const cluster57344 = endpoint?.clusters?.[57344] || endpoint?.clusters?.['57344'];
    if (cluster57344) {
      this.log('[BSEED] ✅ Custom cluster 0xE000 (57344) found');
      if (typeof cluster57344.on === 'function') {
        cluster57344.on('attr', (attrId, value) => {
          this.log(`[BSEED] 0xE000 attr ${attrId}: ${JSON.stringify(value)}`);
        });
      }
    }

    // Cluster 0xE001 (57345) - Bseed proprietary
    const cluster57345 = endpoint?.clusters?.[57345] || endpoint?.clusters?.['57345'];
    if (cluster57345) {
      this.log('[BSEED] ✅ Custom cluster 0xE001 (57345) found');
      if (typeof cluster57345.on === 'function') {
        cluster57345.on('attr', (attrId, value) => {
          this.log(`[BSEED] 0xE001 attr ${attrId}: ${JSON.stringify(value)}`);
        });
      }
    }
  }

  /**
   * Override for standard mode only
   */
  async _registerCapabilityListeners() {
    if (this.isBseedDevice) return; // BSEED has its own listener
    
    await super._registerCapabilityListeners?.();
    this.registerCapabilityListener('onoff', async (value) => {
      this.markAppCommand(1);
      return this._setGangState?.(1, value) || this._setOnOff?.(value);
    });
  }

  onDeleted() {
    // BSEED cleanup
    if (this._bseedState?.appCommandTimeout) {
      clearTimeout(this._bseedState.appCommandTimeout);
    }
    super.onDeleted?.();
    this.log('[SWITCH-1G] Device removed');
  }
}

module.exports = Switch1GangDevice;
