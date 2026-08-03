'use strict';

const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const ManufacturerNameHelper = require('../../lib/helpers/ManufacturerNameHelper');

/**
 * WALL SWITCH 4-GANG 1-WAY (BSEED) - v9.7.3 Unified Architecture
 * v9.7.3: Migrated to unified mixin architecture with sub-device support.
 * Each gang can be a separate Homey device (Sub-device architecture).
 * v10.3.0 FIX (B10): Removed the redundant PhysicalButtonMixin + VirtualButtonMixin double wrap
 * double wrap — UnifiedSwitchBase already inherits both via TuyaZigbeeDevice.
 * v10.6.1 FIX (forum #2099): initPhysicalButtonDetection() was never called —
 * UnifiedSwitchBase.onNodeInit does not chain to TuyaZigbeeDevice.onNodeInit
 * (the only automatic caller), so _physicalButtonState stayed undefined and
 * every physical-press flow (physical_gangN_on/off, gangN_scene) was dead for
 * the Moes TS0014 (_TZ3000_mrduubod). Call it explicitly like switch_4gang does.
 */
class WallSwitch4Gang1WayDevice extends UnifiedSwitchBase {

  get mainsPowered() { return true; }

  get gangCount() { return 4; }

  get switchCapabilities() {
    const { subDeviceId } = (typeof this.getData === 'function' && this.getData()) || {};
    if (subDeviceId) { return ['onoff']; }
    return [
      ...super.switchCapabilities,
      ...Array.from({ length: this.gangCount }, (_, index) => `button.${index + 1}`),
    ];
  }

  get dpMappings() {
    const { subDeviceId } = (typeof this.getData === 'function' && this.getData()) || {};
    const mappings = { ...super.dpMappings };
    
    // v9.7.3: For sub-devices, map the specific Tuya DP to the 'onoff' capability
    if (subDeviceId === 'secondSwitch') {
      mappings[2] = { capability: 'onoff', transform: (v) => v === 1 || v === true };
    } else if (subDeviceId === 'thirdSwitch') {
      mappings[3] = { capability: 'onoff', transform: (v) => v === 1 || v === true };
    } else if (subDeviceId === 'fourthSwitch') {
      mappings[4] = { capability: 'onoff', transform: (v) => v === 1 || v === true };
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
      } else if (subDeviceId === 'fourthSwitch') {
        this._gangNumber = 4;
      } else {
        this._gangNumber = 1;
      }
      this._isSubDevice = Boolean(subDeviceId);
      this.log(`[WALL-4G] Initializing ${this._gangNumber > 1 ? 'Sub' : 'Primary'} Device (Gang ${this._gangNumber})`);
      await super.onNodeInit({ zclNode });
      await this._setupPzaoSceneInterceptor();
      // v10.6.1 FIX (forum #2099): never called before — physical button flows were dead
      if (typeof this.initPhysicalButtonDetection === 'function') {
        await this.initPhysicalButtonDetection(zclNode);
      }
      await this.initVirtualButtons();
      if (typeof this._registerButtonCapabilityListeners === 'function') {
        this._registerButtonCapabilityListeners();
      }
      this.log(`[WALL-4G] v9.7.3 - Unified initialization complete for Gang ${this._gangNumber}`);
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

  async _setupPzaoSceneInterceptor() {
    const manufacturer = ManufacturerNameHelper.getManufacturerName(this).toLowerCase();
    if (manufacturer !== '_tz3002_pzao9ls1' || this._isSubDevice) {return;}

    try {
      const node = await this.homey?.zigbee?.getNode?.(this);
      if (!node || node.__pzaoSceneWrapper) {return;}
      const original = typeof node.handleFrame === 'function' ? node.handleFrame.bind(node) : null;
      const wrapper = async (...args) => {
        const [endpointId, clusterId, frame] = args;
        try {
          // v10.6.0 FIX: `frame` is a raw Buffer with the FULL ZCL header —
          // `frame.cmdId`/`json.cmdId` are undefined on Buffers, so this
          // interceptor NEVER matched (dead since introduction). Parse the
          // header properly (handles the manufacturer-specific 5-byte form).
          const { parseZclHeader } = require('../../lib/zigbee/ZigbeeHelpers');
          const json = typeof frame?.toJSON === 'function' ? frame.toJSON() : frame;
          const data = Buffer.isBuffer(json?.data) ? json.data
            : Array.isArray(json?.data) ? Buffer.from(json.data)
            : Buffer.isBuffer(frame) ? frame : null;
          const hdr = data ? parseZclHeader(data) : null;
          if (Number(clusterId) === 0x0006 && hdr && hdr.cmdId === 0xFD) {
            const gang = Math.max(1, Math.min(4, Number(endpointId) || 1));
            this.log(`[PZAO-SCENE] Scene ${gang} command received`);
            await this.triggerButtonPress(gang, 'single', 1, { source: 'physical' });
          }
        } catch (err) {
          this.log(`[PZAO-SCENE] Decode failed: ${err.message}`);
        }
        return original ? original(...args) : undefined;
      };
      node.handleFrame = wrapper;
      node.__pzaoSceneWrapper = wrapper;
      this._pzaoRawNode = node;
      this._pzaoOriginalHandleFrame = original;
    } catch (err) {
      this.log(`[PZAO-SCENE] Raw interceptor unavailable: ${err.message}`);
    }
  }

  async onDeleted() {
    if (this._pzaoRawNode?.__pzaoSceneWrapper === this._pzaoRawNode.handleFrame) {
      this._pzaoRawNode.handleFrame = this._pzaoOriginalHandleFrame || undefined;
      delete this._pzaoRawNode.__pzaoSceneWrapper;
    }
    this._pzaoRawNode = null;
    this._pzaoOriginalHandleFrame = null;
    await super.onDeleted?.();
  }

}

module.exports = WallSwitch4Gang1WayDevice;
