'use strict';

const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const ManufacturerNameHelper = require('../../lib/helpers/ManufacturerNameHelper');

/**
 * WALL SWITCH 4-GANG 1-WAY (BSEED) - v9.7.3 Unified Architecture
 * v9.7.3: Migrated to unified mixin architecture with sub-device support.
 * Each gang can be a separate Homey device (Sub-device architecture).
 */
class WallSwitch4Gang1WayDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase)) {

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
      await this.initVirtualButtons();
      if (typeof this._registerButtonCapabilityListeners === 'function') {
        this._registerButtonCapabilityListeners();
      }
      this.log(`[WALL-4G] v9.7.3 - Unified initialization complete for Gang ${this._gangNumber}`);
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
          const json = typeof frame?.toJSON === 'function' ? frame.toJSON() : frame;
          const commandId = Number(json?.cmdId ?? json?.commandId ?? frame?.cmdId ?? frame?.commandId);
          if (Number(clusterId) === 0x0006 && commandId === 0xFD) {
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
