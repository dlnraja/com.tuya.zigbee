'use strict';

const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * WALL SWITCH 2-GANG 1-WAY (BSEED) - v9.7.3 Unified Architecture
 * v9.7.3: Migrated to unified mixin architecture with sub-device support.
 * Each gang can be a separate Homey device (Sub-device architecture).
 */
class WallSwitch2Gang1WayDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase)) {

  get mainsPowered() { return true; }

  get gangCount() { return 2; }

  get switchCapabilities() {
    const { subDeviceId } = this.getData();
    return subDeviceId ? ['onoff'] : super.switchCapabilities;
  }

  get dpMappings() {
    const { subDeviceId } = this.getData();
    const mappings = { ...super.dpMappings };
    
    // v9.7.3: For sub-devices, map the specific Tuya DP to the 'onoff' capability
    if (subDeviceId === 'secondSwitch') {
      mappings[2] = { capability: 'onoff', transform: (v) => v === 1 || v === true };
    }
    return mappings;
  }

  async onNodeInit({ zclNode }) {
    // Auto-fix: Remove battery capabilities for mains-powered devices
    await this.removeCapability('measure_battery').catch(() => {});
    await this.removeCapability('alarm_battery').catch(() => {});
    await this._safeInvoke(async () => {
      const { subDeviceId } = this.getData();
      if (subDeviceId === 'secondSwitch') {
        this._gangNumber = 2;
        this.log('[WALL-2G] Initializing Sub-Device (Gang 2)');
      } else {
        this._gangNumber = 1;
        this.log('[WALL-2G] Initializing Primary Device (Gang 1)');
      }
      this._isSubDevice = Boolean(subDeviceId);
      await super.onNodeInit({ zclNode });
      await this.initVirtualButtons();
      this.log(`[WALL-2G] v9.7.3 - Unified initialization complete for Gang ${this._gangNumber}`);
    }, 'onNodeInit');
  }

  /**
   * Filter physical button triggers to only process the gang assigned to this device.
   */
  triggerButtonPress(button, type = 'single', countOrOptions = {}, options = {}) {
    if (this._isSubDevice && this._gangNumber !== undefined && button !== this._gangNumber) {
      return; // Ignore events for other gangs
    }
    const tokens = typeof countOrOptions === 'number'
      ? { clicks: countOrOptions }
      : { ...(countOrOptions || {}) };
    if (options?.source) {
      tokens.source = options.source;
    }
    return this._triggerPhysicalFlow(button, type, { ...tokens, _internalTrigger: true });
  }

  /**
   * Map UI commands to the correct Zigbee/Tuya gang.
   */
  _setGangOnOff(gang, value) {
    const targetGang = this._isSubDevice ? this._gangNumber : gang;
    return super._setGangOnOff(targetGang, value);
  }

}

module.exports = WallSwitch2Gang1WayDevice;
