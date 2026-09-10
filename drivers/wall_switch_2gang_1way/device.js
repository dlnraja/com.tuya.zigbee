'use strict';

const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');

/**
 * WALL SWITCH 2-GANG 1-WAY (BSEED) - v9.7.3 Unified Architecture
 *
 * P2455 GH#544 (migueleap): wired dual-relay UI must be onoff + onoff.gang2 only.
 * Do NOT expose button.* tiles or spawn devices.secondSwitch sub-devices.
 * Couple: _TZ3000_l9brjwau + TS0002 → this driver (ZCL EP1/EP2), not switch_2gang.
 */
class WallSwitch2Gang1WayDevice extends UnifiedSwitchBase {

  get mainsPowered() { return true; }

  get gangCount() { return 2; }

  get switchCapabilities() {
    const { subDeviceId } = (typeof this.getData === 'function' && this.getData()) || {};
    // Legacy sub-device instances (already paired) keep a single onoff tile
    if (subDeviceId) { return ['onoff']; }
    // WHY(P2455): no button.1/button.2 — wired relays only
    return ['onoff', 'onoff.gang2'];
  }

  get dpMappings() {
    const { subDeviceId } = (typeof this.getData === 'function' && this.getData()) || {};
    const mappings = { ...super.dpMappings };
    if (subDeviceId === 'secondSwitch') {
      mappings[2] = { capability: 'onoff', transform: (v) => v === 1 || v === true };
    }
    return mappings;
  }

  async onNodeInit({ zclNode }) {
    await this.removeCapability('measure_battery').catch(() => {});
    await this.removeCapability('alarm_battery').catch(() => {});
    // Strip leftover button clutter from older compose / re-pair without wipe
    for (const cap of ['button.1', 'button.2', 'button.toggle_1', 'button.toggle_2', 'button.identify']) {
      if (this.hasCapability(cap)) {
        await this.removeCapability(cap).catch(() => {});
      }
    }

    await this._safeInvoke(async () => {
      const { subDeviceId } = (typeof this.getData === 'function' && this.getData()) || {};
      if (subDeviceId === 'secondSwitch') {
        this._gangNumber = 2;
        this._isSubDevice = true;
        this.log('[WALL-2G] Legacy sub-device Gang 2');
      } else {
        this._gangNumber = 1;
        this._isSubDevice = false;
        this.log('[WALL-2G] Primary onoff + onoff.gang2 (P2455)');
      }
      await super.onNodeInit({ zclNode });
      this.log(`[WALL-2G] init complete gang=${this._gangNumber} sub=${this._isSubDevice}`);
    }, 'onNodeInit');
  }

  /**
   * Keep physical press → flow routing for already-paired sub-devices only.
   * Primary device uses onoff.gang* — no button.* tiles.
   */
  triggerButtonPress(button, type = 'single', countOrOptions = {}, options = {}) {
    if (!this._isSubDevice) {
      return; // primary: ignore button-tile path
    }
    if (this._gangNumber !== undefined && button !== this._gangNumber) {
      return;
    }
    const tokens = typeof countOrOptions === 'number'
      ? { clicks: countOrOptions }
      : { ...countOrOptions || {} };
    if (options?.source) {
      tokens.source = options.source;
    }
    return this._triggerPhysicalFlow(button, type, { ...tokens, _internalTrigger: true });
  }

  _hasPairedSubDevices() {
    try {
      const kids = this.getChildren?.() || [];
      return Array.isArray(kids) && kids.length > 0;
    } catch (_) {
      return false;
    }
  }
}

module.exports = WallSwitch2Gang1WayDevice;
