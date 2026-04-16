'use strict';
const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * WALL SWITCH 1-GANG 1-WAY - v5.8.95 Bidirectional fix
 * UnifiedSwitchBase._setGangOnOff() now calls markAppCommand() centrally.
 * Compatible with BSEED devices: _TZ3000_blhvsaqf, _TZ3000_ysdv91bk
 */
class WallSwitch1Gang1WayDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase)) {

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
    // UnifiedSwitchBase._setGangOnOff() now calls PhysicalButtonMixin.markAppCommand() centrally.
    await super.onNodeInit({ zclNode });
    this.initPhysicalButtonDetection(); // rule-19 injected
    this._registerCapabilityListeners(); // rule-12a injected
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();
    this.log('[WALL-1G] v5.8.95 - Bidirectional physical+virtual button detection ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WallSwitch1Gang1WayDevice;
