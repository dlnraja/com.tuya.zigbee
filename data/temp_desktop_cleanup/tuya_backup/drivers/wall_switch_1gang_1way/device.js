'use strict';
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * WALL SWITCH 1-GANG 1-WAY - v5.8.95 Bidirectional fix
 * HybridSwitchBase._setGangOnOff() now calls markAppCommand() centrally.
 * Compatible with BSEED devices: _TZ3000_blhvsaqf, _TZ3000_ysdv91bk
 */
class WallSwitch1Gang1WayDevice extends PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase)) {

  get gangCount() { return 1; }

  get sceneMode() { return this.getSetting('scene_mode') || 'auto'; }

  async setSceneMode(mode) {
    this.log('[SCENE] Setting scene mode to:', mode);
    await this.setSettings({ scene_mode: mode }).catch(() => {});
  }

  get dpMappings() {
    const parentMappings = Object.getPrototypeOf(Object.getPrototypeOf(this)).dpMappings || {};
    return { ...parentMappings };
  }

  async onNodeInit({ zclNode }) {
    // v5.8.95: Removed broken _setupPhysicalButtonFlowDetection + _markAppCommand.
    // HybridSwitchBase._setGangOnOff() now calls PhysicalButtonMixin.markAppCommand() centrally.
    await super.onNodeInit({ zclNode });
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();
    this.log('[WALL-1G] v5.8.95 - Bidirectional physical+virtual button detection ready');
  }
}

module.exports = WallSwitch1Gang1WayDevice;
