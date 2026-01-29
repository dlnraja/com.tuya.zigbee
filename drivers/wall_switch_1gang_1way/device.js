'use strict';
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║   WALL SWITCH 1-GANG 1-WAY - HybridSwitchBase + Physical Button Detection   ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Uses HybridSwitchBase which provides:                                       ║
 * ║  - Auto-detection of Tuya DP vs ZCL mode                                     ║
 * ║  - ZCL onOff cluster support for BSEED devices                               ║
 * ║  - Tuya DP support for settings (backlight, etc.)                            ║
 * ║  - ProtocolAutoOptimizer for automatic protocol detection                    ║
 * ║                                                                               ║
 * ║  PhysicalButtonMixin provides:                                               ║
 * ║  - Physical button press detection (single, double, triple, long)            ║
 * ║  - Configurable detection windows                                            ║
 * ║                                                                               ║
 * ║  Compatible with BSEED devices: _TZ3000_blhvsaqf, _TZ3000_ysdv91bk          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class WallSwitch1Gang1WayDevice extends PhysicalButtonMixin(HybridSwitchBase) {

  get gangCount() { return 1; }

  /**
   * EXTEND parent dpMappings - Keep it simple for 1-gang switches
   */
  get dpMappings() {
    const parentMappings = Object.getPrototypeOf(Object.getPrototypeOf(this)).dpMappings || {};
    return {
      ...parentMappings,
      // No additional DPs needed for basic 1-gang switch
    };
  }

  async onNodeInit({ zclNode }) {
    this.log('════════════════════════════════════════');
    this.log('Wall Switch 1-Gang 1-Way initializing...');
    this.log('════════════════════════════════════════');

    // Track state for detecting physical button presses
    this._lastOnoffState = null;
    this._appCommandPending = false;
    this._appCommandTimeout = null;

    // Let parent HybridSwitchBase handle protocol auto-detection
    await super.onNodeInit({ zclNode });

    // Initialize physical button detection
    await this.initPhysicalButtonDetection(zclNode);

    // Override capability listener to track app commands
    this._setupPhysicalButtonFlowDetection();

    this.log('════════════════════════════════════════');
    this.log('Wall Switch 1-Gang 1-Way ready');
    this.log('════════════════════════════════════════');
  }

  /**
   * Setup physical button flow detection
   * Overrides the capability listener to track app vs physical button presses
   */
  _setupPhysicalButtonFlowDetection() {
    this.log('[PHYSICAL-BUTTON] Setting up flow detection...');

    // Re-register capability listener to mark app commands
    this.registerCapabilityListener('onoff', async (value) => {
      this.log('onoff capability changed to:', value, '(APP)');
      this._markAppCommand();
      // Call parent's capability handler
      return this._setGangOnOff(1, value);
    });

    // Hook into the parent's DP handler to detect physical button presses
    const originalHandleDatapoint = this._handleTuyaDatapoint?.bind(this);
    if (originalHandleDatapoint) {
      this._handleTuyaDatapoint = (dp, data, reportingEvent = false) => {
        // Check if this is an onoff change
        if (dp === 1) {
          const state = Boolean(data?.value ?? data);
          const isPhysicalPress = reportingEvent && !this._appCommandPending;

          // Only trigger flows if state actually changed and it's physical
          if (this._lastOnoffState !== state) {
            this._lastOnoffState = state;

            if (isPhysicalPress) {
              const flowCardId = state ? 'wall_switch_1gang_1way_turned_on' : 'wall_switch_1gang_1way_turned_off';
              this.log(`[PHYSICAL-BUTTON] Triggering: ${flowCardId}`);
              this.homey.flow.getDeviceTriggerCard(flowCardId)
                .trigger(this, {}, {})
                .catch(err => this.error(`Flow trigger failed: ${err.message}`));
            }
          }
        }

        // Call original handler
        return originalHandleDatapoint(dp, data, reportingEvent);
      };
    }
  }

  /**
   * Mark that an app command was sent
   * Used to distinguish physical button presses from app commands
   */
  _markAppCommand() {
    this._appCommandPending = true;
    if (this._appCommandTimeout) {
      clearTimeout(this._appCommandTimeout);
    }
    // Clear after 2 seconds - device should respond within this time
    this._appCommandTimeout = setTimeout(() => {
      this._appCommandPending = false;
    }, 2000);
  }

}

module.exports = WallSwitch1Gang1WayDevice;
