'use strict';

const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const { containsCI } = require('../../lib/utils/CaseInsensitiveMatcher');

/**
 * WALL SWITCH 3-GANG 1-WAY (BSEED) - v9.7.3 Unified Architecture
 * v9.7.3: Migrated to unified mixin architecture with sub-device support.
 * Each gang can be a separate Homey device (Sub-device architecture).
 * v10.3.0 FIX (B10): Removed the redundant PhysicalButtonMixin + VirtualButtonMixin double wrap
 * double wrap — UnifiedSwitchBase already inherits both via TuyaZigbeeDevice.
 */
// WHY(P2465 / Johan#1457 / Z2M SFL02-Z-3): Moes Star Feather 3-gang uses DP24/25/26
const MOES_STAR_FEATHER_3G = [
  '_tze200_zo0cfekv', '_tze200_tzyy0rtq', '_tze200_rd8cdssd',
];

class WallSwitch3Gang1WayDevice extends UnifiedSwitchBase {

  get mainsPowered() { return true; }

  get gangCount() { return 3; }

  // WHY(P2463/P2465): wall tiles must stay onoff — no phantom Botón
  get skipGangButtonUi() { return true; }

  get isMoesStarFeather3() {
    if (this._msfCached !== undefined) { return this._msfCached; }
    const mfr = this.getSetting?.('zb_manufacturer_name') || this.getData?.()?.manufacturerName || '';
    this._msfCached = MOES_STAR_FEATHER_3G.some((m) => containsCI(mfr, m));
    return this._msfCached;
  }

  get switchCapabilities() {
    const { subDeviceId } = (typeof this.getData === 'function' && this.getData()) || {};
    if (subDeviceId) { return ['onoff']; }
    // no button.N — skipGangButtonUi + compose strip
    return super.switchCapabilities;
  }

  get dpMappings() {
    const { subDeviceId } = (typeof this.getData === 'function' && this.getData()) || {};
    const bool = (v) => v === 1 || v === true || v === '1';

    // Moes Star Feather (EF00): DP24/25/26 = l1/l2/l3
    if (this.isMoesStarFeather3) {
      if (subDeviceId === 'secondSwitch') {
        return { 25: { capability: 'onoff', transform: bool } };
      }
      if (subDeviceId === 'thirdSwitch') {
        return { 26: { capability: 'onoff', transform: bool } };
      }
      return {
        24: { capability: 'onoff', transform: bool },
        25: { capability: 'onoff.gang2', transform: bool },
        26: { capability: 'onoff.gang3', transform: bool },
      };
    }

    const mappings = { ...super.dpMappings };
    // v9.7.3: For sub-devices, map the specific Tuya DP to the 'onoff' capability
    if (subDeviceId === 'secondSwitch') {
      mappings[2] = { capability: 'onoff', transform: bool };
    } else if (subDeviceId === 'thirdSwitch') {
      mappings[3] = { capability: 'onoff', transform: bool };
    }
    return mappings;
  }

  async onNodeInit({ zclNode }) {
    // Auto-fix: Remove battery capabilities for mains-powered devices
    await this.removeCapability('measure_battery').catch(() => {});
    await this.removeCapability('alarm_battery').catch(() => {});
    await this._safeInvoke(async () => {
      const { subDeviceId } = (typeof this.getData === 'function' && this.getData()) || {};
      if (subDeviceId === 'secondSwitch') {
        this._gangNumber = 2;
      } else if (subDeviceId === 'thirdSwitch') {
        this._gangNumber = 3;
      } else {
        this._gangNumber = 1;
      }
      this._isSubDevice = Boolean(subDeviceId);
      this.log(`[WALL-3G] Initializing ${this._gangNumber > 1 ? 'Sub' : 'Primary'} Device (Gang ${this._gangNumber})`);
      await super.onNodeInit({ zclNode });
      await this.initVirtualButtons();
      if (typeof this._registerButtonCapabilityListeners === 'function') {
        this._registerButtonCapabilityListeners();
      }
      this.log(`[WALL-3G] v9.7.3 - Unified initialization complete for Gang ${this._gangNumber}`);
    }, 'onNodeInit');
  }

  /**
   * Filter physical button triggers to only process the gang assigned to this device.
   * v10.3.0 FIX (B10): the primary instance now filters too when sub-devices
   * are paired — previously it processed every gang, double-triggering flows
   * alongside the owning sub-device.
   */
  triggerButtonPress(button, type = 'single', countOrOptions = {}, options = {}) {
    if (this._gangNumber !== undefined && button !== this._gangNumber
      && (this._isSubDevice || this._hasPairedSubDevices())) {
      return; // Ignore events for gangs owned by another (sub-)device
    }
    const tokens = typeof countOrOptions === 'number'
      ? { clicks: countOrOptions }
      : { ...countOrOptions || {} };
    if (options?.source) {
      tokens.source = options.source;
    }
    return this._triggerPhysicalFlow(button, type, { ...tokens, _internalTrigger: true });
  }

  /**
   * v10.3.0 FIX (B10): True when sibling sub-devices (e.g. 'secondSwitch')
   * are paired — the primary device must then ignore their gangs.
   */
  _hasPairedSubDevices() {
    try {
      return (this.driver?.getDevices?.() || [])
        .some((d) => d !== this && Boolean(d.getData?.()?.subDeviceId));
    } catch (_e) {return false;}
  }

  /**
   * Map UI commands to the correct Zigbee/Tuya gang.
   */
  _setGangOnOff(gang, value) {
    const targetGang = this._isSubDevice ? this._gangNumber : gang;
    return super._setGangOnOff(targetGang, value);
  }

}

module.exports = WallSwitch3Gang1WayDevice;
