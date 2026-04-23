'use strict';
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');

/**
 * WALL SWITCH 1-GANG 1-WAY - v5.8.95 Bidirectional fix
 * HybridSwitchBase provides centralized physical/virtual button support.
 * Compatible with BSEED devices: _TZ3000_blhvsaqf, _TZ3000_ysdv91bk
 */
class WallSwitch1Gang1WayDevice extends HybridSwitchBase {

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
    await super.onNodeInit({ zclNode });
    this.log('[WALL-1G] v5.8.95 - Hybrid bidirectional support ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WallSwitch1Gang1WayDevice;
